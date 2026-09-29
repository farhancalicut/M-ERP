import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  runTransaction,
  serverTimestamp,
  QueryDocumentSnapshot,
  Timestamp,
  QueryConstraint,
  deleteDoc,
  getDoc,
  deleteField
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Class } from "@/types/schema";
import { Status } from "@/types/enums";
import { dashboardService } from "@/features/reports/services/dashboardService";

const COLLECTION = "classes";

export const classService = {
  
  /**
   * Get a single class by id
   */
  getClass: async (id: string): Promise<Class | null> => {
    const { getDoc } = await import("firebase/firestore");
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Class;
    }
    return null;
  },

  /**
   * Get paginated classes for a madrassa & academic year
   */
  getClasses: async (
    madrassaId: string,
    statusFilter?: Status | "ALL",
    searchTerm?: string,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ classes: Class[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (statusFilter && statusFilter !== "ALL") {
      constraints.push(where("status", "==", statusFilter));
    }
    
    if (searchTerm) {
      constraints.push(
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + "\uf8ff")
      );
    }
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    const classes: Class[] = [];
    snapshot.forEach(doc => {
      classes.push({ id: doc.id, ...doc.data() } as Class);
    });

    if (!searchTerm) {
      classes.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    const newLastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
    return { classes, lastDoc: newLastDoc };
  },

  /**
   * Create a new Class
   */
  createClass: async (data: Omit<Class, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, createdBy: string): Promise<Class> => {
    const docRef = doc(collection(db, COLLECTION));
    const newClass: Class = {
      ...data,
      id: docRef.id,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy
    };
    
    // Uniqueness check can be done here or in rules. Let's do a quick read check to avoid dupes in the same year.
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", data.madrassaId),
      where("name", "==", data.name),
      limit(1)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error(`A class with name ${data.name} already exists in this academic year.`);
    }

    await runTransaction(db, async (transaction) => {
      let userDoc;
      if (newClass.classTeacherId) {
        userDoc = await transaction.get(doc(db, "users", newClass.classTeacherId));
      }

      transaction.set(docRef, newClass);
      
      // Sync with User assignedClassIds
      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data();
        const currentClasses = userData.assignedClassIds || [];
        if (!currentClasses.includes(newClass.id)) {
          transaction.update(userDoc.ref, {
            assignedClassIds: [...currentClasses, newClass.id]
          });
        }
      }
    });
    
    // Update dashboard stat without blocking transaction
    dashboardService.updateStatCounter(data.madrassaId, "totalClasses", 1).catch(console.error);
    
    return newClass;
  },

  /**
   * Update an existing Class
   */
  updateClass: async (id: string, data: Partial<Class>, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    
    // Check if name is being updated for duplicates
    if (data.name && data.madrassaId) {
       const q = query(
        collection(db, COLLECTION),
        where("madrassaId", "==", data.madrassaId),
        where("name", "==", data.name),
        limit(1)
      );
      const existing = await getDocs(q);
      if (!existing.empty && existing.docs[0]?.id !== id) {
        throw new Error(`A class with name ${data.name} already exists in this academic year.`);
      }
    }

    await runTransaction(db, async (transaction) => {
      const classDoc = await transaction.get(docRef);
      const oldClass = classDoc.data() as Class | undefined;
      
      // 1. PERFORM ALL READS FIRST
      let oldUserDoc;
      let newUserDoc;
      if (oldClass && "classTeacherId" in data && data.classTeacherId !== oldClass.classTeacherId) {
        if (oldClass.classTeacherId) {
          oldUserDoc = await transaction.get(doc(db, "users", oldClass.classTeacherId));
        }
        if (data.classTeacherId && typeof data.classTeacherId === 'string') {
          newUserDoc = await transaction.get(doc(db, "users", data.classTeacherId));
        }
      }
      
      // 2. PERFORM ALL WRITES
      // Validate capacity logic if it's being updated
      if (data.capacity !== undefined) {
         const currentStrength = oldClass?.currentStrength || 0;
         if (data.capacity < currentStrength) {
             throw new Error(`Capacity cannot be lower than current strength (${currentStrength}).`);
         }
      }

      transaction.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy
      });
      
      // Sync with User assignedClassIds if classTeacherId changed
      if (oldUserDoc && oldUserDoc.exists()) {
        const userData = oldUserDoc.data();
        const currentClasses = userData.assignedClassIds || [];
        transaction.update(oldUserDoc.ref, {
          assignedClassIds: currentClasses.filter((cid: string) => cid !== id)
        });
      }
      
      if (newUserDoc && newUserDoc.exists()) {
        const userData = newUserDoc.data();
        const currentClasses = userData.assignedClassIds || [];
        if (!currentClasses.includes(id)) {
          transaction.update(newUserDoc.ref, {
            assignedClassIds: [...currentClasses, id]
          });
        }
      }
    });
  },

  /**
   * Soft delete (archive) Class
   */
  archiveClass: async (id: string, madrassaId: string, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    
    const assignmentsQuery = query(
        collection(db, "teacherAssignments"),
        where("madrassaId", "==", madrassaId),
        where("classIds", "array-contains", id),
        where("status", "==", "ACTIVE"),
        limit(1)
    );
    const assignmentsSnap = await getDocs(assignmentsQuery);
    if (!assignmentsSnap.empty) {
        throw new Error("Cannot archive class: active teacher assignments exist.");
    }

    await runTransaction(db, async (transaction) => {
      const classDoc = await transaction.get(docRef);
      if (!classDoc.exists()) return;
      const data = classDoc.data() as Class;
      
      let teacherDoc = null;
      if (data.classTeacherId) {
        teacherDoc = await transaction.get(doc(db, "users", data.classTeacherId));
      }
      
      if ((data.currentStrength || 0) > 0) {
          throw new Error("Cannot archive class: there are still active students.");
      }

      transaction.update(docRef, {
        status: "ARCHIVED" as Status,
        classTeacherId: deleteField() as unknown as string,
        updatedAt: serverTimestamp(),
        updatedBy
      });
      
      if (teacherDoc && teacherDoc.exists()) {
        const tData = teacherDoc.data();
        const currentClasses = tData.assignedClassIds || [];
        transaction.update(teacherDoc.ref, {
           assignedClassIds: currentClasses.filter((cid: string) => cid !== id)
        });
      }
    });
  },

  /**
   * Delete Class
   */
  deleteClass: async (id: string, madrassaId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    
    const assignmentsQuery = query(
        collection(db, "teacherAssignments"),
        where("madrassaId", "==", madrassaId),
        where("classIds", "array-contains", id),
        where("status", "==", "ACTIVE"),
        limit(1)
    );
    const assignmentsSnap = await getDocs(assignmentsQuery);
    if (!assignmentsSnap.empty) {
        throw new Error("Cannot delete class: active teacher assignments exist.");
    }
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;
      const data = docSnap.data() as Class;
      
      let teacherDoc = null;
      if (data.classTeacherId) {
        teacherDoc = await transaction.get(doc(db, "users", data.classTeacherId));
      }
      
      if ((data.currentStrength || 0) > 0) {
          throw new Error("Cannot delete class: there are still active students.");
      }
      
      transaction.delete(docRef);
      
      if (teacherDoc && teacherDoc.exists()) {
        const tData = teacherDoc.data();
        const currentClasses = tData.assignedClassIds || [];
        transaction.update(teacherDoc.ref, {
           assignedClassIds: currentClasses.filter((cid: string) => cid !== id)
        });
      }
    });

    // Update dashboard stat without blocking transaction
    dashboardService.updateStatCounter(madrassaId, "totalClasses", -1).catch(console.error);
  }
};

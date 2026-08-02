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
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Subject } from "@/types/schema";
import { Status } from "@/types/enums";

const COLLECTION = "subjects";

export const subjectService = {
  
  /**
   * Get paginated subjects for a madrassa & academic year
   */
    getSubjects: async (
      madrassaId: string,
      statusFilter?: Status | "ALL",
      searchTerm?: string,
      pageSize: number = 20,
      lastDoc?: QueryDocumentSnapshot
    ): Promise<{ subjects: Subject[], lastDoc: QueryDocumentSnapshot | null }> => {
      const constraints: QueryConstraint[] = [
        where("madrassaId", "==", madrassaId),
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
    
    const subjects: Subject[] = [];
    snapshot.forEach(doc => {
      subjects.push({ id: doc.id, ...doc.data() } as Subject);
    });

    if (!searchTerm) {
      subjects.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    const newLastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
    return { subjects, lastDoc: newLastDoc };
  },

  /**
   * Create a new Subject
   */
  createSubject: async (data: Omit<Subject, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, createdBy: string): Promise<Subject> => {
    const docRef = doc(collection(db, COLLECTION));
    const newSubject: Subject = {
      ...data,
      id: docRef.id,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy
    };
    
    // Check for unique code in the madrassa
    const qCode = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", data.madrassaId),
      where("code", "==", data.code),
      limit(1)
    );
    const existingCode = await getDocs(qCode);
    if (!existingCode.empty) {
      throw new Error(`A subject with code ${data.code} already exists.`);
    }

    // Check for unique name
    const qName = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", data.madrassaId),
      where("name", "==", data.name),
      limit(1)
    );
    const existingName = await getDocs(qName);
    if (!existingName.empty) {
      throw new Error(`A subject with name ${data.name} already exists.`);
    }

    await runTransaction(db, async (transaction) => {
      transaction.set(docRef, newSubject);
    });
    
    import("@/features/reports/services/dashboardService").then(({ dashboardService }) => {
      dashboardService.updateStatCounter(data.madrassaId, "totalSubjects", 1).catch(console.error);
    });
    
    return newSubject;
  },

  /**
   * Update an existing Subject
   */
  updateSubject: async (id: string, data: Partial<Subject>, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    
    if (data.code && data.madrassaId) {
       const q = query(
        collection(db, COLLECTION),
        where("madrassaId", "==", data.madrassaId),
        where("code", "==", data.code),
        limit(1)
      );
      const existing = await getDocs(q);
      if (!existing.empty && existing.docs[0]?.id !== id) {
        throw new Error(`A subject with code ${data.code} already exists.`);
      }
    }

    if (data.name && data.madrassaId) {
       const q = query(
        collection(db, COLLECTION),
        where("madrassaId", "==", data.madrassaId),
        where("name", "==", data.name),
        limit(1)
      );
      const existing = await getDocs(q);
      if (!existing.empty && existing.docs[0]?.id !== id) {
        throw new Error(`A subject with name ${data.name} already exists.`);
      }
    }

    await runTransaction(db, async (transaction) => {
      transaction.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy
      });
    });
  },

  /**
   * Soft delete (archive) Subject
   */
  archiveSubject: async (id: string, madrassaId: string, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    
    // Check if assignments exist
    const assignmentsQuery = query(
        collection(db, "teacherAssignments"),
        where("madrassaId", "==", madrassaId),
        where("subjectIds", "array-contains", id),
        where("status", "==", "ACTIVE"),
        limit(1)
    );
    const assignmentsSnap = await getDocs(assignmentsQuery);
    if (!assignmentsSnap.empty) {
        throw new Error("Cannot archive subject: active teacher assignments exist.");
    }

    // Future: check if exams exist for this subject
    const canArchiveSubject = async (): Promise<boolean> => {
      // Placeholder for future Exam check
      return true;
    }

    const isArchivable = await canArchiveSubject();
    if (!isArchivable) {
        throw new Error("Cannot archive subject: exams exist.");
    }

    await runTransaction(db, async (transaction) => {
      transaction.update(docRef, {
        status: "ARCHIVED" as Status,
        updatedAt: serverTimestamp(),
        updatedBy
      });
    });

    import("@/features/reports/services/dashboardService").then(({ dashboardService }) => {
      dashboardService.updateStatCounter(madrassaId, "totalSubjects", -1).catch(console.error);
    });
  }
};

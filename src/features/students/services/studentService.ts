import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  startAfter,
  orderBy,
  QueryConstraint,
  updateDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  documentId,
  runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Student } from "../types";
import { StudentStatus } from "@/types/enums";

const COLLECTION = "students";

export const studentService = {
  getStudent: async (studentId: string): Promise<Student | null> => {
    const docRef = doc(db, COLLECTION, studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Student;
    }
    return null;
  },

  getStudentsByParent: async (madrassaId: string, parentUserId: string): Promise<Student[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("parentId", "==", parentUserId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ studentId: d.id, ...d.data() } as unknown as Student));
  },

  getStudentsByIds: async (madrassaId: string, studentIds: string[]): Promise<Student[]> => {
    if (!studentIds || studentIds.length === 0) return [];
    
    // Fetch each student individually to avoid composite index requirements
    // and to satisfy Firestore security rules which require exact document lookups
    // or explicit madrassaId filtering.
    const promises = studentIds.map(async (id) => {
      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Student;
        // Verify it belongs to the same madrassa just in case
        if (data.madrassaId === madrassaId) {
          return { ...data, studentId: docSnap.id };
        }
      }
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter((s): s is Student => s !== null);
  },

  updateStudent: async (studentId: string, data: Partial<Student>): Promise<void> => {
    const docRef = doc(db, COLLECTION, studentId);
    if (data.classId) {
      await runTransaction(db, async (transaction) => {
        const studentDoc = await transaction.get(docRef);
        if (!studentDoc.exists()) throw new Error("Student not found");
        const studentData = studentDoc.data() as Student;
        
        let oldClassDoc = null;
        let newClassDoc = null;
        
        if (studentData.classId && studentData.classId !== data.classId) {
          oldClassDoc = await transaction.get(doc(db, 'classes', studentData.classId as string));
          newClassDoc = await transaction.get(doc(db, 'classes', data.classId as string));
        }

        transaction.update(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });

        if (oldClassDoc && oldClassDoc.exists()) {
          const strength = oldClassDoc.data().currentStrength || 0;
          transaction.update(oldClassDoc.ref, { currentStrength: Math.max(0, strength - 1) });
        }
        if (newClassDoc && newClassDoc.exists()) {
          const strength = newClassDoc.data().currentStrength || 0;
          transaction.update(newClassDoc.ref, { currentStrength: strength + 1 });
        }
      });
    } else {
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
  },

  softDeleteStudent: async (studentId: string, deletedBy: string): Promise<void> => {
    return studentService.changeStudentStatus(studentId, 'DELETED' as StudentStatus, deletedBy);
  },

  changeStudentStatus: async (studentId: string, status: StudentStatus, updatedBy?: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, studentId);
    
    let madrassaId = "";
    let statChange = 0;
    
    await runTransaction(db, async (transaction) => {
      const studentDoc = await transaction.get(docRef);
      if (!studentDoc.exists()) throw new Error("Student not found");
      
      const studentData = studentDoc.data() as Student;
      madrassaId = studentData.madrassaId;
      
      // If status isn't actually changing, do nothing
      if (studentData.status === status) return;
      
      const wasActive = studentData.status === 'ACTIVE';
      const isNowActive = status === 'ACTIVE';
      
      let classDoc = null;
      if (studentData.classId) {
        classDoc = await transaction.get(doc(db, 'classes', studentData.classId));
      }
      
      let parentDoc = null;
      if (studentData.parentId) {
        parentDoc = await transaction.get(doc(db, 'parents', studentData.parentId));
      }
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };
      if (status === 'DELETED' && updatedBy) {
        updateData.deletedBy = updatedBy;
        updateData.deletedAt = serverTimestamp();
      }
      
      transaction.update(docRef, updateData);
      
      if (wasActive && !isNowActive) {
        statChange = -1;
        // Student became inactive/deleted
        if (classDoc && classDoc.exists()) {
          const strength = classDoc.data().currentStrength || 0;
          transaction.update(classDoc.ref, { currentStrength: Math.max(0, strength - 1) });
        }
        if (parentDoc && parentDoc.exists()) {
          const pCount = parentDoc.data().studentCount || 0;
          transaction.update(parentDoc.ref, { studentCount: Math.max(0, pCount - 1) });
        }
      } else if (!wasActive && isNowActive) {
        statChange = 1;
        // Student became active again
        if (classDoc && classDoc.exists()) {
          const strength = classDoc.data().currentStrength || 0;
          transaction.update(classDoc.ref, { currentStrength: strength + 1 });
        }
        if (parentDoc && parentDoc.exists()) {
          const pCount = parentDoc.data().studentCount || 0;
          transaction.update(parentDoc.ref, { studentCount: pCount + 1 });
        }
      }
    });
    
    // Update dashboard stat outside transaction
    if (madrassaId && statChange !== 0) {
      import("@/features/reports/services/dashboardService").then(({ dashboardService }) => {
         dashboardService.updateStatCounter(madrassaId, "totalStudents", statChange).catch(console.error);
      });
    }
  },

  searchStudents: async (
    madrassaId: string,
    filters: {
      admissionNo?: string;
      nameSearch?: string; // Expect lowercase input for prefix search
      classId?: string;
      status?: StudentStatus;
      gender?: string;
    },
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ students: Student[], lastDoc: QueryDocumentSnapshot | null }> => {
    
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (filters.status) constraints.push(where("status", "==", filters.status));
    if (filters.classId) constraints.push(where("classId", "==", filters.classId));
    if (filters.gender) constraints.push(where("gender", "==", filters.gender));
    if (filters.admissionNo) constraints.push(where("admissionNo", "==", filters.admissionNo));

    if (filters.nameSearch) {
      constraints.push(where("nameSearch", ">=", filters.nameSearch.toLowerCase()));
      constraints.push(where("nameSearch", "<=", filters.nameSearch.toLowerCase() + '\uf8ff'));
      constraints.push(orderBy("nameSearch", "asc"));
    } else {
      // Only orderBy createdAt if no secondary equality filters are applied
      // to prevent Firestore composite index errors
      if (!filters.classId && !filters.gender && !filters.admissionNo) {
        constraints.push(orderBy("createdAt", "desc"));
      }
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const students: Student[] = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, studentId: doc.id, ...doc.data() } as unknown as Student);
    });

    const newLastDoc = querySnapshot.docs.length > 0 ? (querySnapshot.docs[querySnapshot.docs.length - 1] || null) : null;

    return { students, lastDoc: newLastDoc };
  },


  getParentStudents: async (madrassaId: string, parentUid: string): Promise<Student[]> => {
    // According to Phase 8, students have a 'parentUserId' or 'parentId'. We will just query for it.
    // If we assume parentId is stored on the student document:
    const q = query(
      collection(db, COLLECTION), 
      where("madrassaId", "==", madrassaId), 
      where("parentUid", "==", parentUid)
    );
    const snap = await getDocs(q);
    const students: Student[] = [];
    snap.forEach(doc => students.push(doc.data() as Student));
    return students;
  }
};

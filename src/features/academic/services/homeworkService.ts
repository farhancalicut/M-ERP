import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Homework } from "@/types/schema";
import { HomeworkFormValues } from "../schemas/academicSchemas";

const COLLECTION_NAME = "homeworks";

export const homeworkService = {
  createHomework: async (madrassaId: string, data: HomeworkFormValues, userId: string): Promise<string> => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const id = docRef.id;
    
    // Default academic year handling - typically passed down or queried but to keep it simple, we assume the caller has it or we can pass it.
    // Wait, we didn't pass academicYearId in createHomework params. We need it. Let's add it.
    throw new Error("Use createHomeworkWithYear instead");
  },

  createHomeworkWithYear: async (madrassaId: string, academicYearId: string, data: HomeworkFormValues, userId: string): Promise<string> => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const id = docRef.id;
    
    const homework: Homework = {
      id,
      madrassaId,
      academicYearId,
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      attachments: data.attachments.map(a => ({ ...a, uploadedAt: Timestamp.now() })),
      teacherId: userId,
      dueDate: Timestamp.fromDate(data.dueDate),
      status: 'PUBLISHED', // Start as published for simplicity, or DRAFT
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    await setDoc(docRef, homework);
    return id;
  },

  updateHomework: async (id: string, data: HomeworkFormValues, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      attachments: data.attachments.map(a => ({ ...a, uploadedAt: Timestamp.now() })), // simplify by resetting upload time
      assignedDate: Timestamp.fromDate(data.assignedDate),
      dueDate: Timestamp.fromDate(data.dueDate),
      allowSubmission: data.allowSubmission,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  updateStatus: async (id: string, status: Homework['status'], userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  getHomework: async (id: string): Promise<Homework | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as Homework;
  },

  getHomeworks: async (
    madrassaId: string, 
    academicYearId: string, 
    filters?: { classId?: string; subjectId?: string; status?: Homework['status'] },
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize = 20
  ) => {
    let q = query(
      collection(db, COLLECTION_NAME),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId)
    );

    if (filters?.classId) {
      q = query(q, where("classId", "==", filters.classId));
    }
    if (filters?.subjectId) {
      q = query(q, where("subjectId", "==", filters.subjectId));
    }
    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    } else {
      // By default, exclude archived if not explicitly requested
      q = query(q, where("status", "!=", "ARCHIVED"));
    }

    q = query(q, orderBy("status"), orderBy("createdAt", "desc"));
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const homeworks = querySnapshot.docs.map(doc => doc.data() as Homework);
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { homeworks, lastDoc: newLastDoc };
  }
};

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { AcademicAssignment } from "@/types/schema";
import { AssignmentFormValues } from "../schemas/academicSchemas";

const COLLECTION_NAME = "assignments";

export const assignmentService = {
  createAssignment: async (madrassaId: string, academicYearId: string, data: AssignmentFormValues, userId: string): Promise<string> => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const id = docRef.id;
    
    const assignment: AcademicAssignment = {
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
      totalMarks: data.totalMarks,
      status: 'PUBLISHED',
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    await setDoc(docRef, assignment);
    return id;
  },

  updateAssignment: async (id: string, data: AssignmentFormValues, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      attachments: data.attachments.map(a => ({ ...a, uploadedAt: Timestamp.now() })),
      assignedDate: Timestamp.fromDate(data.assignedDate),
      dueDate: Timestamp.fromDate(data.dueDate),
      totalMarks: data.totalMarks,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  updateStatus: async (id: string, status: AcademicAssignment['status'], userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  getAssignment: async (id: string): Promise<AcademicAssignment | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as AcademicAssignment;
  },

  getAssignments: async (
    madrassaId: string, 
    academicYearId: string, 
    filters?: { classId?: string; subjectId?: string; status?: AcademicAssignment['status'] },
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
      q = query(q, where("status", "!=", "ARCHIVED"));
    }

    q = query(q, orderBy("status"), orderBy("createdAt", "desc"));
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const assignments = querySnapshot.docs.map(doc => doc.data() as AcademicAssignment);
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { assignments, lastDoc: newLastDoc };
  }
};

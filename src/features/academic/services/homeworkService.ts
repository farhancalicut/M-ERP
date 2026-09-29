import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Homework } from "@/types/schema";
import { HomeworkFormValues } from "../schemas/academicSchemas";
import { notificationService } from "@/features/notifications/services/notificationService";

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
      assignedDate: Timestamp.fromDate(data.assignedDate),
      dueDate: Timestamp.fromDate(data.dueDate),
      allowSubmission: data.allowSubmission,
      status: 'PUBLISHED', // Start as published for simplicity, or DRAFT
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    } as any;

    await setDoc(docRef, homework);

    // Notify parents of this class (best-effort)
    notificationService.createNotificationSafe({
      madrassaId,
      type: "HOMEWORK",
      title: "New Homework Assigned",
      message: `${data.title} has been assigned. Due: ${data.dueDate.toLocaleDateString()}.`,
      receiverType: "CLASS",
      receiverIds: [data.classId],
      priority: "MEDIUM",
      status: "ACTIVE",
      readBy: [],
    } as any);

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

    const querySnapshot = await getDocs(q);
    let homeworks = querySnapshot.docs.map(doc => doc.data() as Homework);

    if (filters?.classId) {
      homeworks = homeworks.filter(h => h.classId === filters.classId);
    }
    if (filters?.subjectId) {
      homeworks = homeworks.filter(h => h.subjectId === filters.subjectId);
    }
    if (filters?.status) {
      homeworks = homeworks.filter(h => h.status === filters.status);
    } else {
      homeworks = homeworks.filter(h => h.status !== "ARCHIVED");
    }

    homeworks.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });

    return { homeworks, lastDoc: null };
  }
};

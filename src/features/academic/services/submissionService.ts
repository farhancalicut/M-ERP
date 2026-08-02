import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { HomeworkSubmission } from "@/types/schema";
import { HomeworkSubmissionValues, SubmissionReviewValues } from "../schemas/academicSchemas";

const COLLECTION_NAME = "homeworkSubmissions";

export const submissionService = {
  submitHomework: async (madrassaId: string, academicYearId: string, homeworkId: string, studentId: string, parentId: string, data: HomeworkSubmissionValues): Promise<string> => {
    const id = `${homeworkId}_${studentId}`;
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const submission: HomeworkSubmission = {
      id,
      madrassaId,
      academicYearId,
      homeworkId,
      studentId,
      attachments: (data.attachments || []).map(a => ({ ...a, uploadedAt: Timestamp.now() })),
      submittedAt: Timestamp.now(),
      status: 'SUBMITTED',
      createdAt: Timestamp.now(),
      createdBy: parentId,
      updatedAt: Timestamp.now(),
      updatedBy: parentId,
    };

    // Using setDoc directly. If it exists, it overwrites (acts as an update).
    // The rules state that a parent can update until homework is CLOSED, which we will validate at UI level and optionally in rules.
    await setDoc(docRef, submission);
    return id;
  },

  reviewSubmission: async (id: string, data: SubmissionReviewValues, teacherId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      reviewed: true,
      reviewedAt: Timestamp.now(),
      reviewedBy: teacherId,
      remarks: data.remarks || "",
      status: 'REVIEWED',
      updatedAt: Timestamp.now(),
    });
  },

  getSubmission: async (homeworkId: string, studentId: string): Promise<HomeworkSubmission | null> => {
    const id = `${homeworkId}_${studentId}`;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as HomeworkSubmission;
  },

  getSubmissionsByHomework: async (
    madrassaId: string, 
    homeworkId: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize = 50
  ) => {
    let q = query(
      collection(db, COLLECTION_NAME),
      where("madrassaId", "==", madrassaId),
      where("homeworkId", "==", homeworkId),
      orderBy("submittedAt", "desc")
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const submissions = querySnapshot.docs.map(doc => doc.data() as HomeworkSubmission);
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { submissions, lastDoc: newLastDoc };
  },

  getStudentSubmissions: async (
    madrassaId: string, 
    studentId: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize = 20
  ) => {
    let q = query(
      collection(db, COLLECTION_NAME),
      where("madrassaId", "==", madrassaId),
      where("studentId", "==", studentId),
      orderBy("submittedAt", "desc")
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const submissions = querySnapshot.docs.map(doc => doc.data() as HomeworkSubmission);
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { submissions, lastDoc: newLastDoc };
  }
};

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
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
import { Exam, Class, Subject } from "@/types/schema";
import { ExamStatus } from "@/types/enums";
import { classService } from "@/features/academic/services/classService";
import { subjectService } from "@/features/academic/services/subjectService";

const COLLECTION = "exams";

export const examService = {
  
  /**
   * Get paginated exams for a madrassa & academic year
   */
  getExams: async (
    madrassaId: string,
    academicYearId: string,
    statusFilter?: ExamStatus | "ALL",
    searchTerm?: string,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ exams: Exam[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId)
    ];

    if (statusFilter && statusFilter !== "ALL") {
      constraints.push(where("status", "==", statusFilter));
    }
    
    // Sort by name if searching, else by startDate desc
    if (searchTerm) {
      constraints.push(
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + "\uf8ff")
      );
    } else {
      constraints.push(orderBy("startDate", "desc"));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    const exams: Exam[] = [];
    snapshot.forEach(doc => {
      exams.push({ id: doc.id, ...doc.data() } as Exam);
    });

    const newLastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
    return { exams, lastDoc: newLastDoc };
  },

  getExam: async (id: string): Promise<Exam | null> => {
    const docRef = doc(db, COLLECTION, id as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Exam;
    }
    return null;
  },

  /**
   * Helper to get full class details for an exam
   */
  getExamClasses: async (madrassaId: string, exam: Exam): Promise<Class[]> => {
    if (!exam.classIds || exam.classIds.length === 0) return [];
    // Just fetch all classes for the academic year and filter locally to save heavy querying
    // Alternatively, use chunked `in` queries if classService supports it.
    const { classes } = await classService.getClasses(madrassaId, "ALL", undefined, 100);
    return classes.filter(c => exam.classIds.includes(c.id as string));
  },



  /**
   * Create a new Exam
   */
  createExam: async (data: Omit<Exam, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, createdBy: string): Promise<Exam> => {
    const docRef = doc(collection(db, COLLECTION));
    const newExam: Exam = {
      ...data,
      id: docRef.id,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy
    };
    
    // Quick uniqueness check
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", data.madrassaId),
      where("academicYearId", "==", data.academicYearId),
      where("name", "==", data.name),
      limit(1)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error(`An exam with name ${data.name} already exists.`);
    }

    await runTransaction(db, async (transaction) => {
      transaction.set(docRef, newExam);
    });
    
    return newExam;
  },

  /**
   * Update an existing Exam
   */
  updateExam: async (id: string, data: Partial<Exam>, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id as string);
    
    // Check if name is being updated for duplicates
    if (data.name && data.madrassaId && data.academicYearId) {
       const q = query(
        collection(db, COLLECTION),
        where("madrassaId", "==", data.madrassaId),
        where("academicYearId", "==", data.academicYearId),
        where("name", "==", data.name),
        limit(1)
      );
      const existing = await getDocs(q);
      if (!existing.empty && existing.docs[0]?.id !== id) {
        throw new Error(`An exam with name ${data.name} already exists.`);
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

  activateExam: async (id: string, updatedBy: string): Promise<void> => {
    await examService.updateExam(id, { status: 'ACTIVE' }, updatedBy);
  },

  completeExam: async (id: string, updatedBy: string): Promise<void> => {
    await examService.updateExam(id, { status: 'COMPLETED' }, updatedBy);
  },

  archiveExam: async (id: string, updatedBy: string): Promise<void> => {
    await examService.updateExam(id, { status: 'ARCHIVED' }, updatedBy);
  }
};

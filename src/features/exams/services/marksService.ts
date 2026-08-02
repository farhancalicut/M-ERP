import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  runTransaction,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Mark, SubjectMark, Exam } from "@/types/schema";
import { studentService } from "@/features/students/services/studentService";

const COLLECTION = "marks";

export const marksService = {
  
  /**
   * Generates the document ID based on Exam ID and Class ID
   */
  getMarksDocumentId: (examId: string, classId: string) => `${examId}_${classId}`,

  /**
   * Retrieves marks for an exam & class.
   */
  getMarks: async (examId: string, classId: string): Promise<Mark | null> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Mark;
    }
    return null;
  },

  /**
   * Fetch all marks documents for a class (for report card building)
   */
  getClassMarks: async (madrassaId: string, academicYearId: string, classId: string): Promise<Mark[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("classId", "==", classId)
    );
    const snap = await getDocs(q);
    const marks: Mark[] = [];
    snap.forEach(doc => {
      marks.push({ id: doc.id, ...doc.data() } as Mark);
    });
    return marks;
  },

  /**
   * Initializes the marks document for an exam and class using a transaction.
   * Pulls current active students from the class.
   */
  initializeMarksDocument: async (
    exam: Exam, 
    classId: string, 
    createdByUserId: string
  ): Promise<Mark> => {
    const docId = marksService.getMarksDocumentId(exam.id as string, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    // Fetch active students in class
    const { students } = await studentService.searchStudents(
      exam.madrassaId, 
      { classId: classId, status: "ACTIVE" }, 
      500
    );

    try {
      return await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);
        if (existingDoc.exists()) {
          return { id: existingDoc.id, ...existingDoc.data() } as Mark;
        }

        const totalStudents = students.length;
        const studentIds: string[] = [];
        const marksMap: Record<string, Record<string, SubjectMark>> = {};

        students.forEach(student => {
          studentIds.push(student.studentId);
          
          const studentMarks: Record<string, SubjectMark> = {};
          // Initialize subjects
          exam.subjects.forEach(subject => {
            studentMarks[subject.subjectName] = {
              marksObtained: null,
              absent: false,
              remarks: "",
              updatedBy: createdByUserId,
              updatedAt: serverTimestamp() as unknown as Timestamp
            };
          });
          marksMap[student.studentId] = studentMarks;
        });

        const newMarkDoc: Omit<Mark, "id"> = {
          madrassaId: exam.madrassaId,
          academicYearId: exam.academicYearId,
          examId: exam.id as string,
          classId,
          totalStudents,
          submitted: false,
          locked: false,
          status: "DRAFT",
          studentIds,
          marks: marksMap,
          createdBy: createdByUserId,
          createdAt: serverTimestamp() as unknown as Timestamp,
          updatedBy: createdByUserId,
          updatedAt: serverTimestamp() as unknown as Timestamp
        };

        transaction.set(docRef, newMarkDoc);
        return { id: docId, ...newMarkDoc } as Mark;
      });
    } catch (error: any) {
      if (error?.code === 'already-exists' || error?.message?.includes('already-exists')) {
        // Fallback: document was created by a racing request (like React strict mode)
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() } as Mark;
        }
      }
      throw error;
    }
  },

  /**
   * Save draft of marks (partial updates)
   * The updates parameter maps studentId -> subjectId -> SubjectMark
   */
   saveDraft: async (
    examId: string, 
    classId: string, 
    updates: Record<string, Record<string, SubjectMark>>,
    updatedByUserId: string
  ): Promise<void> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Marks document not found");
      const data = snap.data() as Mark;
      
      if (data.locked) throw new Error("Cannot edit locked marks.");
      if (data.status === "SUBMITTED" && data.submitted) throw new Error("Cannot edit submitted marks unless unlocked/drafted.");

      const newMarks = { ...data.marks };
      for (const [studentId, subjectData] of Object.entries(updates)) {
        if (!newMarks[studentId]) newMarks[studentId] = {};
        for (const [subjectId, markData] of Object.entries(subjectData)) {
          newMarks[studentId][subjectId] = {
            ...markData,
            absent: markData.absent || false,
            marksObtained: markData.marksObtained === undefined ? null : markData.marksObtained,
            ceMarksObtained: markData.ceMarksObtained === undefined ? null : markData.ceMarksObtained,
            updatedBy: updatedByUserId,
            updatedAt: serverTimestamp() as unknown as Timestamp
          };
        }
      }

      transaction.update(docRef, {
        marks: newMarks,
        updatedBy: updatedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  /**
   * Force save/update marks (used by principals overriding even if submitted)
   */
  updateMarks: async (
    examId: string, 
    classId: string, 
    updates: Record<string, Record<string, SubjectMark>>,
    updatedByUserId: string
  ): Promise<void> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Marks document not found");
      const data = snap.data() as Mark;
      
      if (data.locked) throw new Error("Cannot edit locked marks. Unlock first.");

      const newMarks = { ...data.marks };
      for (const [studentId, subjectData] of Object.entries(updates)) {
        if (!newMarks[studentId]) newMarks[studentId] = {};
        for (const [subjectId, markData] of Object.entries(subjectData)) {
          newMarks[studentId][subjectId] = {
            ...markData,
            absent: markData.absent || false,
            marksObtained: markData.marksObtained === undefined ? null : markData.marksObtained,
            ceMarksObtained: markData.ceMarksObtained === undefined ? null : markData.ceMarksObtained,
            updatedBy: updatedByUserId,
            updatedAt: serverTimestamp() as unknown as Timestamp
          };
        }
      }

      transaction.update(docRef, {
        marks: newMarks,
        updatedBy: updatedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  /**
   * Submit marks
   */
  submitMarks: async (examId: string, classId: string, updates: Record<string, Record<string, SubjectMark>>, submittedByUserId: string): Promise<void> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Marks document not found");
      const data = snap.data() as Mark;
      if (data.locked) throw new Error("Cannot modify locked marks");

      // Apply updates and mark submittedBy on all entries
      const newMarks = { ...data.marks };
      
      for (const [studentId, subjectData] of Object.entries(updates)) {
        if (!newMarks[studentId]) newMarks[studentId] = {};
        for (const [subjectId, markData] of Object.entries(subjectData)) {
          newMarks[studentId][subjectId] = {
            ...markData,
            absent: markData.absent || false,
            marksObtained: markData.marksObtained === undefined ? null : markData.marksObtained,
            ceMarksObtained: markData.ceMarksObtained === undefined ? null : markData.ceMarksObtained,
            submittedBy: submittedByUserId,
            updatedBy: submittedByUserId,
            updatedAt: serverTimestamp() as unknown as Timestamp
          };
        }
      }

      transaction.update(docRef, {
        marks: newMarks,
        submitted: true,
        submittedAt: serverTimestamp(),
        status: "SUBMITTED",
        updatedBy: submittedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  lockMarks: async (examId: string, classId: string, lockedByUserId: string): Promise<void> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Marks document not found");
      
      transaction.update(docRef, {
        locked: true,
        lockedAt: serverTimestamp(),
        lockedBy: lockedByUserId,
        status: "LOCKED",
        updatedBy: lockedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  unlockMarks: async (examId: string, classId: string, unlockedByUserId: string): Promise<void> => {
    const docId = marksService.getMarksDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Marks document not found");
      const data = snap.data() as Mark;

      // To unlock, we revert status back to what it logically is (SUBMITTED or DRAFT)
      const newStatus = data.submitted ? "SUBMITTED" : "DRAFT";

      transaction.update(docRef, {
        locked: false,
        lockedAt: null,
        lockedBy: null,
        status: newStatus,
        updatedBy: unlockedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  canEditMarks: (markDoc: Mark, userRole: string): boolean => {
    if (markDoc.locked) return false;
    if (userRole === "TEACHER" && markDoc.submitted) return false;
    return true;
  }
};

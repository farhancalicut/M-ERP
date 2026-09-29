import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  runTransaction,
  serverTimestamp,
  Timestamp,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Result, StudentResult, GradeConfig } from "@/types/schema";
import { gradeSettingsService } from "@/features/settings/services/gradeSettingsService";
import { marksService } from "./marksService";
import { examService } from "./examService";
import { notificationService } from "@/features/notifications/services/notificationService";

const COLLECTION = "results";

export const resultService = {
  
  getResultDocumentId: (examId: string, classId: string) => `${examId}_${classId}`,

  /**
   * Calculate grade based on percentage and GradeConfig
   */
  calculateGrade: (percentage: number, config: GradeConfig): { grade: string, gradePoint: number, isFail: boolean } => {
    // If percentage is below passPercentage, it's a fail regardless of the grades list bounds, 
    // but we still try to find the matching grade.
    const isFail = percentage < config.passPercentage;
    
    // Sort grades by minPercentage desc to find the highest match easily
    const sortedGrades = [...config.grades].sort((a, b) => b.minPercentage - a.minPercentage);
    
    for (const boundary of sortedGrades) {
      // Allow slight floating point tolerance (e.g. 89.999 => 90 if bounded strictly)
      // but standard is >= min and <= max
      if (percentage >= boundary.minPercentage) {
        return { grade: boundary.grade, gradePoint: boundary.gradePoint, isFail };
      }
    }
    
    // Fallback if no boundary matched
    return { grade: "N/A", gradePoint: 0, isFail: true };
  },

  /**
   * Calculate individual student result
   */
  calculateStudentResult: (
    studentMarks: Record<string, import("@/types/schema").SubjectMark>, 
    examSubjects: import("@/types/schema").ExamSubject[], 
    config: GradeConfig,
    isFinalExam: boolean,
    includeCE?: boolean,
    maxCEMarks?: number
  ): StudentResult => {
    let totalMarks = 0;
    let obtainedMarks = 0;
    const failedSubjects: string[] = [];

    for (const sub of examSubjects) {
      const markEntry = studentMarks[sub.subjectName];
      totalMarks += sub.totalMarks;
      
      if (includeCE && maxCEMarks !== undefined && maxCEMarks > 0) {
        totalMarks += maxCEMarks;
      }
      
      if (!markEntry || markEntry.absent || markEntry.marksObtained === null) {
        // Absent or null marks means 0 obtained, and they fail the subject
        failedSubjects.push(sub.subjectName);
        continue;
      }

      obtainedMarks += markEntry.marksObtained;
      
      if (includeCE && maxCEMarks !== undefined && maxCEMarks > 0 && markEntry.ceMarksObtained !== undefined && markEntry.ceMarksObtained !== null) {
        obtainedMarks += markEntry.ceMarksObtained;
      }

      // Subject-level failure detection
      if (markEntry.marksObtained < sub.passMarks) {
        failedSubjects.push(sub.subjectName);
      }
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const { grade, gradePoint, isFail } = resultService.calculateGrade(percentage, config);

    // Final Result Status: Fail if percentage < pass OR any subject failed
    const finalIsFail = isFail || failedSubjects.length > 0;
    const isPromoted = isFinalExam ? !finalIsFail : undefined;

    const result: StudentResult = {
      totalMarks,
      obtainedMarks,
      percentage: Number(percentage.toFixed(2)),
      grade,
      gradePoint,
      failedSubjects,
      resultStatus: finalIsFail ? "FAIL" : "PASS"
    };

    if (isPromoted !== undefined) {
      result.isPromoted = isPromoted;
    }

    return result;
  },

  /**
   * Generates results for an exam & class
   * Maximum 3 reads: marks, exam, gradeConfig
   */
  generateResults: async (examId: string, classId: string, generatedByUserId: string): Promise<Result> => {
    const docId = resultService.getResultDocumentId(examId, classId);
    
    // 1. Read marks
    const marksDoc = await marksService.getMarks(examId, classId);
    if (!marksDoc) throw new Error("Marks document not found for this class/exam.");
    if (marksDoc.status !== "LOCKED") throw new Error("Marks must be LOCKED before generating results.");

    // 2. Read exam (for subjects/totalMarks/passMarks)
    const examDoc = await examService.getExam(examId);
    if (!examDoc) throw new Error("Exam document not found.");

    // 3. Read settings/grades
    const gradeConfig = await gradeSettingsService.getGradeSettings(examDoc.madrassaId);

    // 4. Generate results locally
    const studentResults: Record<string, StudentResult> = {};
    let passCount = 0;
    let failCount = 0;

    const activeSubjects = examDoc.classSubjects?.[classId] || examDoc.subjects || [];
    const isFinalExam = examDoc.examType === "Final";

    for (const studentId of marksDoc.studentIds) {
      const studentMarks = marksDoc.marks[studentId] || {};
      const mappedConfig = gradeConfig ? {
        passPercentage: gradeConfig.failurePercentage,
        grades: gradeConfig.grades
      } : { passPercentage: 33, grades: [] };
      const sResult = resultService.calculateStudentResult(
        studentMarks, 
        activeSubjects, 
        mappedConfig as any,
        isFinalExam,
        examDoc.includeCE,
        examDoc.maxCEMarks
      );
      studentResults[studentId] = sResult;

      if (sResult.resultStatus === "PASS") passCount++;
      else failCount++;
    }

    const newResult: Omit<Result, "id"> = {
      madrassaId: examDoc.madrassaId,
      academicYearId: examDoc.academicYearId,
      examId: examId,
      classId,
      totalStudents: marksDoc.totalStudents,
      passCount,
      failCount,
      status: "ACTIVE",
      published: false,
      generatedAt: serverTimestamp() as unknown as Timestamp,
      students: studentResults,
      createdAt: serverTimestamp() as unknown as Timestamp,
      createdBy: generatedByUserId,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      updatedBy: generatedByUserId
    };

    // 5. Write one results document
    const docRef = doc(db, COLLECTION, docId as string);
    await setDoc(docRef, newResult);

    return { id: docId, ...newResult } as Result;
  },

  /**
   * Retrieve a generated result document
   */
  getResults: async (examId: string, classId: string): Promise<Result | null> => {
    const docId = resultService.getResultDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Result;
    }
    return null;
  },

  /**
   * Publish results (making them visible to parents)
   */
  publishResults: async (examId: string, classId: string, publishedByUserId: string): Promise<void> => {
    const docId = resultService.getResultDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    // Fetch exam details to get the name for the notification message
    let examName = "an exam";
    try {
      const exam = await examService.getExam(examId);
      if (exam?.name) examName = exam.name;
    } catch { /* non-critical */ }

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Results document not found. Generate results first.");
      const data = snap.data() as Result;

      if (data.published) return; // Already published

      transaction.update(docRef, {
        published: true,
        publishedAt: serverTimestamp(),
        updatedBy: publishedByUserId,
        updatedAt: serverTimestamp()
      });
    });

    // Notify parents of this class (broadcast to PARENT role, filtered by CLASS)
    notificationService.createNotificationSafe({
      madrassaId: (await examService.getExam(examId))?.madrassaId ?? "",
      type: "RESULT",
      title: "Exam Results Published",
      message: `Results for ${examName} are now available. Log in to view your child's performance.`,
      receiverType: "CLASS",
      receiverIds: [classId],
      priority: "HIGH",
      status: "ACTIVE",
      readBy: [],
    } as any);
  },

  /**
   * Unpublish results
   */
  unpublishResults: async (examId: string, classId: string, unpublishedByUserId: string): Promise<void> => {
    const docId = resultService.getResultDocumentId(examId, classId);
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Results document not found.");
      
      transaction.update(docRef, {
        published: false,
        publishedAt: null,
        updatedBy: unpublishedByUserId,
        updatedAt: serverTimestamp()
      });
    });
  },

  /**
   * Fetch all published results for a list of students across all exams in an academic year
   * (Used by Parent viewing)
   */
  getStudentPublishedResults: async (madrassaId: string, academicYearId: string, studentIds: string[]): Promise<Result[]> => {
    if (studentIds.length === 0) return [];

    // Note: We can't query by embedded map keys (e.g. `students.${studentId}` exists) efficiently in Firestore.
    // However, since we query all published results for the academic year and filter locally, 
    // it's efficient enough if the total exams * classes isn't huge.
    // Alternatively, parents know the class ID their child is in. So we could fetch by classId.
    // We will fetch published results for the madrassa/academicYear and filter locally.
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("published", "==", true)
    );
    const snap = await getDocs(q);
    const allResults = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));

    // Filter to only those results that contain at least one of the requested studentIds
    return allResults.filter(res => {
      return studentIds.some(sid => !!res.students[sid]);
    });
  }
};

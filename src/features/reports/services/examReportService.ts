import { collection, query, where, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { Result } from "@/types/schema";

export const examReportService = {
  /**
   * Generates a result sheet for a specific class and exam.
   */
  async generateExamReport(madrassaId: string, examId: string, classId: string): Promise<Result[]> {
    if (!examId || !classId) {
      throw new Error("Exam and Class are mandatory filters for Examination Report.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("examId", "==", examId),
      where("classId", "==", classId)
    ];

    const q = query(collection(db, "examResults"), ...constraints);
    const results = await reportHelper.executeQueryWithLimit<Result>(q, 500);

    return results;
  },

  /**
   * Generates a student's exam results for parents.
   */
  async generateStudentExamReport(madrassaId: string, studentId: string, academicYearId: string): Promise<Result[]> {
    if (!studentId || !academicYearId) {
      throw new Error("Student and Academic Year are mandatory filters.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("studentId", "==", studentId),
      where("academicYearId", "==", academicYearId)
    ];

    const q = query(collection(db, "examResults"), ...constraints);
    return await reportHelper.executeQueryWithLimit<Result>(q, 500);
  }
};

import { collection, query, where, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { Attendance } from "@/types/schema";

export const attendanceReportService = {
  /**
   * Generates attendance report for a specific class and month.
   */
  async generateClassAttendanceReport(madrassaId: string, classId: string, monthPrefix: string): Promise<Attendance[]> {
    if (!classId || !monthPrefix) {
      throw new Error("Class and Month are mandatory filters for Class Attendance Report.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("classId", "==", classId)
    ];

    const q = query(collection(db, "attendance"), ...constraints);
    const allRecords = await reportHelper.executeQueryWithLimit<Attendance>(q, 500);

    // Filter by month prefix (e.g. '2023-10') client side if we don't have a specific field, 
    // assuming date is stored as "YYYY-MM-DD" in the `date` field.
    return allRecords.filter(record => record.date.startsWith(monthPrefix));
  },

  /**
   * Generates attendance report for a specific student across an academic year or date range.
   * Useful for Parent Dashboard.
   */
  async generateStudentAttendanceReport(madrassaId: string, studentId: string, academicYearId: string): Promise<Attendance[]> {
    if (!studentId || !academicYearId) {
      throw new Error("Student and Academic Year are mandatory filters.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("studentIds", "array-contains", studentId),
      where("academicYearId", "==", academicYearId)
    ];

    const q = query(collection(db, "attendance"), ...constraints);
    const records = await reportHelper.executeQueryWithLimit<Attendance>(q, 500);
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
};

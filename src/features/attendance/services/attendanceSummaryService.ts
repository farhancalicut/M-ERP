import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Attendance } from "@/types/schema";

const COLLECTION = "attendance";

export interface StudentMonthlySummary {
  studentId: string;
  month: number;
  year: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  totalDays: number;
  attendancePercentage: number;
}

export const attendanceSummaryService = {
  /**
   * Fetches all attendance records for a specific class in a given month/year.
   * This is used to compute aggregations client-side and minimize Firestore read costs.
   */
  getClassMonthlyDocs: async (
    madrassaId: string,
    academicYearId: string,
    classId: string,
    month: number,
    year: number
  ): Promise<Attendance[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("classId", "==", classId),
      where("month", "==", month),
      where("year", "==", year)
    );

    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Attendance);
  },

  /**
   * Computes the attendance percentage and summary for a single student in a given month.
   */
  getStudentAttendanceSummary: async (
    madrassaId: string,
    academicYearId: string,
    classId: string,
    studentId: string,
    month: number,
    year: number
  ): Promise<StudentMonthlySummary | null> => {
    const docs = await attendanceSummaryService.getClassMonthlyDocs(
      madrassaId,
      academicYearId,
      classId,
      month,
      year
    );

    if (docs.length === 0) return null;

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    docs.forEach(doc => {
      // Check if student was part of the snapshot when this document was created
      if (doc.attendance[studentId]) {
        const status = doc.attendance[studentId].status;
        if (status === "PRESENT") presentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "LEAVE") leaveCount++;
      }
    });

    const totalDays = presentCount + absentCount + leaveCount;
    const attendancePercentage = totalDays > 0 ? (presentCount / totalDays) * 100 : 0;

    return {
      studentId,
      month,
      year,
      presentCount,
      absentCount,
      leaveCount,
      totalDays,
      attendancePercentage: Math.round(attendancePercentage * 10) / 10 // Round to 1 decimal
    };
  }
};

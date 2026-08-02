import { collection, query, where, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { User } from "@/types/schema";

export const studentReportService = {
  /**
   * Generates a student report based on the provided filters.
   * Enforces a maximum limit of 500 records via reportHelper.
   */
  async generateStudentReport(madrassaId: string, filters: {
    classId?: string;
    gender?: string;
    status?: string;
    role?: "STUDENT" | "ALUMNI";
  }): Promise<User[]> {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("role", "==", filters.role || "STUDENT")
    ];

    if (filters.classId) constraints.push(where("classId", "==", filters.classId));
    if (filters.gender) constraints.push(where("gender", "==", filters.gender));
    if (filters.status) constraints.push(where("status", "==", filters.status));

    // orderBy might require composite indexes depending on filters,
    // so we sort by createdAt by default or omit it and sort client-side.
    // For broad compatibility without building many indexes, we will just sort client-side
    // because the result set is small (<= 500).

    const q = query(collection(db, "users"), ...constraints);
    const students = await reportHelper.executeQueryWithLimit<User>(q, 500);

    // Sort client-side to avoid index explosion
    return students.sort((a, b) => (a as any).displayName.localeCompare((b as any).displayName));
  }
};

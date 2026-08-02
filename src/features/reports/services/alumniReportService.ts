import { collection, query, where, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { User } from "@/types/schema";

export const alumniReportService = {
  /**
   * Generates a report of alumni based on graduation year.
   */
  async generateAlumniReport(madrassaId: string, graduationYear: string): Promise<User[]> {
    if (!graduationYear) {
      throw new Error("Graduation Year is a mandatory filter for Alumni Reports.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("role", "==", "ALUMNI"),
      where("status", "==", "ACTIVE")
    ];

    const q = query(collection(db, "users"), ...constraints);
    const alumni = await reportHelper.executeQueryWithLimit<User>(q, 500);

    // Filter by graduationYear client-side since we might not have an index on it
    return alumni.filter(a => (a as any).alumniProfile?.graduationYear === graduationYear);
  }
};

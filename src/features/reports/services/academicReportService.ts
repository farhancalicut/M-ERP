import { collection, query, where, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { Class, Subject } from "@/types/schema";

export const academicReportService = {
  /**
   * Generates academic summary (classes and subjects).
   */
  async generateAcademicReport(madrassaId: string): Promise<{ classes: Class[], subjects: Subject[] }> {
    const classesQ = query(collection(db, "classes"), where("madrassaId", "==", madrassaId));
    const subjectsQ = query(collection(db, "subjects"), where("madrassaId", "==", madrassaId));

    const [classes, subjects] = await Promise.all([
      reportHelper.executeQueryWithLimit<Class>(classesQ, 500),
      reportHelper.executeQueryWithLimit<Subject>(subjectsQ, 500)
    ]);

    return { classes, subjects };
  }
};

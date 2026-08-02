import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { GradeSettings, SettingsGradeBoundary } from "@/types/schema";

const COLLECTION = "settings";

export const gradeSettingsService = {
  getDocId(madrassaId: string) {
    return `${madrassaId}_grades`;
  },

  async getGradeSettings(madrassaId: string): Promise<GradeSettings | null> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as GradeSettings;
    }
    return null;
  },

  validateGrades(grades: SettingsGradeBoundary[], failurePercentage: number) {
    // Check min < max
    for (const g of grades) {
      if (g.minPercentage >= g.maxPercentage) {
        throw new Error(`Grade ${g.grade} has invalid percentage range (${g.minPercentage} - ${g.maxPercentage})`);
      }
      if (failurePercentage > g.minPercentage && failurePercentage < g.maxPercentage) {
        throw new Error(`Failure percentage (${failurePercentage}%) overlaps with Grade ${g.grade}`);
      }
    }

    // Check overlap
    for (let i = 0; i < grades.length; i++) {
      for (let j = i + 1; j < grades.length; j++) {
        const g1 = grades[i]!;
        const g2 = grades[j]!;
        const overlaps = Math.max(g1.minPercentage, g2.minPercentage) < Math.min(g1.maxPercentage, g2.maxPercentage);
        if (overlaps) {
          throw new Error(`Grade ${g1.grade} and ${g2.grade} have overlapping percentage ranges`);
        }
      }
    }
  },

  async updateGradeSettings(madrassaId: string, data: Partial<GradeSettings>, userId: string): Promise<void> {
    if (data.grades !== undefined || data.failurePercentage !== undefined) {
      // If we are updating grades, we need the full picture to validate
      let current;
      try {
        current = await this.getGradeSettings(madrassaId) || { grades: [], failurePercentage: 0 };
      } catch (e) {
        console.error("FAILED IN GETTING GRADE SETTINGS", e);
        throw new Error("Failed reading grade settings: " + (e as Error).message);
      }
      const gradesToValidate = data.grades ?? current.grades;
      const failPctToValidate = data.failurePercentage ?? current.failurePercentage;
      this.validateGrades(gradesToValidate, failPctToValidate);
    }

    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    try {
      await setDoc(docRef, {
        ...data,
        madrassaId,
        updatedBy: userId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("FAILED IN SETTING GRADE SETTINGS", e);
      throw new Error("Failed saving grade settings: " + (e as Error).message);
    }
  }
};

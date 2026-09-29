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

  validateGrades(grades: SettingsGradeBoundary[]) {
    // Check min < max
    for (const g of grades) {
      if (g.minPercentage >= g.maxPercentage) {
        throw new Error(`Grade ${g.grade} has invalid percentage range (${g.minPercentage} - ${g.maxPercentage})`);
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
    if (data.grades !== undefined) {
      // If we are updating grades, we need the full picture to validate
      let current;
      try {
        current = await this.getGradeSettings(madrassaId) || { grades: [] };
      } catch (e) {
        console.error("FAILED IN GETTING GRADE SETTINGS", e);
        throw new Error("Failed reading grade settings: " + (e as Error).message);
      }
      const gradesToValidate = data.grades ?? current.grades;
      this.validateGrades(gradesToValidate);
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

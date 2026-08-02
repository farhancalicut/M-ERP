import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

export const setupService = {
  async completeSetup(madrassaId: string) {
    try {
      const docRef = doc(db, "madrassas", madrassaId);
      await updateDoc(docRef, {
        isSetupComplete: true
      });
    } catch (error) {
      console.error("Error completing setup:", error);
      throw error;
    }
  }
};

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { GeneralSettings } from "@/types/schema";

const COLLECTION = "settings";

export const generalSettingsService = {
  getDocId(madrassaId: string) {
    return `${madrassaId}_general`;
  },

  async getGeneralSettings(madrassaId: string): Promise<GeneralSettings | null> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as GeneralSettings;
    }
    return null;
  },

  async updateGeneralSettings(madrassaId: string, data: Partial<GeneralSettings>, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    await setDoc(docRef, {
      ...data,
      madrassaId,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

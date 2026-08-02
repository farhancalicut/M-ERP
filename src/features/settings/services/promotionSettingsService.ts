import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { PromotionSettings } from "@/types/schema";

const COLLECTION = "settings";

export const promotionSettingsService = {
  getDocId(madrassaId: string) {
    return `${madrassaId}_promotion`;
  },

  async getPromotionSettings(madrassaId: string): Promise<PromotionSettings | null> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PromotionSettings;
    }
    return {
      madrassaId,
      autoSuggestPromotion: true,
      allowManualOverride: true,
      updatedBy: "system",
      updatedAt: serverTimestamp()
    } as any;
  },

  async updatePromotionSettings(madrassaId: string, data: Partial<PromotionSettings>, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    await setDoc(docRef, {
      ...data,
      madrassaId,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

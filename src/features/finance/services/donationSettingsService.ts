import { collection, doc, getDocs, getDoc, query, where, orderBy, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { DonationSettings } from "@/types/schema";

const COLLECTION = "donationSettings";

export const donationSettingsService = {
  getSettings: async (madrassaId: string): Promise<DonationSettings | null> => {
    const docRef = doc(db, COLLECTION, madrassaId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as DonationSettings;
  },

  updateSettings: async (
    madrassaId: string, 
    data: { title: string; description: string; qrCodeUrl?: string }, 
    userId: string
  ): Promise<void> => {
    const docRef = doc(db, COLLECTION, madrassaId);
    await setDoc(docRef, {
      madrassaId,
      ...data,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

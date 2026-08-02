import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { NotificationSettings } from "@/types/schema";

const COLLECTION = "settings";

export const notificationSettingsService = {
  getDocId(madrassaId: string) {
    return `${madrassaId}_notifications`;
  },

  async getNotificationSettings(madrassaId: string): Promise<NotificationSettings | null> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as NotificationSettings;
    }
    return {
      madrassaId,
      noticeRetentionDays: 30,
      notificationRetentionDays: 7,
      updatedBy: "system",
      updatedAt: serverTimestamp()
    } as any;
  },

  async updateNotificationSettings(madrassaId: string, data: Partial<NotificationSettings>, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    await setDoc(docRef, {
      ...data,
      madrassaId,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

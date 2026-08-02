import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { AttendanceSettings } from "@/types/schema";

const COLLECTION = "settings";

export const attendanceSettingsService = {
  getDocId(madrassaId: string) {
    return `${madrassaId}_attendance`;
  },

  async getAttendanceSettings(madrassaId: string): Promise<AttendanceSettings | null> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AttendanceSettings;
    }
    // Default fallback
    return {
      madrassaId,
      allowPastEditDays: 3,
      allowFutureAttendance: false,
      attendanceAlertThreshold: 75,
      weekendDays: [0, 6], // default to Sunday, Saturday
      defaultStatus: "PRESENT",
      updatedBy: "system",
      updatedAt: serverTimestamp()
    } as any;
  },

  async updateAttendanceSettings(madrassaId: string, data: Partial<AttendanceSettings>, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTION, this.getDocId(madrassaId));
    await setDoc(docRef, {
      ...data,
      madrassaId,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

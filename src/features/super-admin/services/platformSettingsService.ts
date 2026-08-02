import { db } from "@/lib/firebase/firestore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { PlatformSettings } from "@/types/schema";

const COLLECTION = "platformSettings";
const DOC_ID = "global";

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "Madrassa ERP",
  supportEmail: "support@madrassa-erp.com",
  supportPhone: "+91 98765 43210",
  defaultPlan: "Basic",
  defaultTrialDays: 14,
  enableSmsNotifications: false,
  maintenanceMode: false,
};

export const platformSettingsService = {
  async getSettings(): Promise<PlatformSettings> {
    try {
      const docRef = doc(db, COLLECTION, DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PlatformSettings;
      }

      // If no settings exist yet, return defaults
      return { id: DOC_ID, ...DEFAULT_SETTINGS };
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      throw error;
    }
  },

  async updateSettings(data: Partial<PlatformSettings>, updatedBy: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION, DOC_ID);
      
      await setDoc(
        docRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
          updatedBy,
        },
        { merge: true } // Merge ensures we create if it doesn't exist, and only update provided fields if it does
      );
    } catch (error) {
      console.error("Error updating platform settings:", error);
      throw error;
    }
  }
};

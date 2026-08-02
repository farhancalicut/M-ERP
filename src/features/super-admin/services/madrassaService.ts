import { db } from "@/lib/firebase/firestore";
import { collection, doc, setDoc, getDoc, runTransaction, query, getDocs, updateDoc, Timestamp, orderBy, getCountFromServer, where, limit } from "firebase/firestore";
import { Madrassa, SubscriptionStatus, AuditLog } from "@/types/schema";
import { hashPassword } from "@/features/auth/utils/crypto";
import { uploadToCloudinary } from "@/lib/cloudinary";

import { PlatformSubscriptionPlan } from "@/types/schema";

interface OnboardMadrassaData {
  name: string;
  board: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  email: string;
  subscriptionPlan: string;
  subscriptionExpiry: Date;
  managerName: string;
  managerEmail: string;
  managerMobile: string;
}

export const madrassaService = {
  async onboardMadrassa(data: OnboardMadrassaData, createdByUid: string) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // 1. Generate new Madrassa ID
        const counterRef = doc(db, "counters", "madrassa-ids");
        const counterDoc = await transaction.get(counterRef);
        
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = (counterDoc.data().current || 0) + 1;
          transaction.update(counterRef, { current: newCount, updatedAt: Timestamp.now() });
        } else {
          transaction.set(counterRef, { current: newCount, createdAt: Timestamp.now() });
        }
        
        const madrassaCode = `MDR${newCount.toString().padStart(4, '0')}`;
        
        // 2. Create Madrassa Document
        const madrassaRef = doc(db, "madrassas", madrassaCode);
        const madrassaData: Madrassa = {
          name: data.name,
          code: madrassaCode,
          board: data.board,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          contactNumber: data.contactNumber,
          email: data.email,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionStatus: "ACTIVE",
          subscriptionExpiry: Timestamp.fromDate(data.subscriptionExpiry),
          status: "ACTIVE",
          isSetupComplete: false,
          createdAt: Timestamp.now(),
          createdBy: createdByUid,
        };
        transaction.set(madrassaRef, madrassaData);
        
        // 3. Generate Temporary Credentials for Manager
        const tempPassword = Math.random().toString(36).slice(-8);
        const { hash, salt, iterations } = await hashPassword(tempPassword);
        const pendingUserRef = doc(db, "pendingUsers", data.managerEmail.toLowerCase());
        transaction.set(pendingUserRef, {
          email: data.managerEmail,
          passwordHash: hash,
          salt,
          iterations,
          role: "MANAGEMENT",
          madrassaId: madrassaCode,
          firstName: data.managerName.split(" ")[0] || data.managerName,
          lastName: data.managerName.split(" ").slice(1).join(" ") || "",
          createdAt: Timestamp.now(),
          createdBy: createdByUid,
          isUsed: false
        });

        return {
          madrassaCode,
          managerEmail: data.managerEmail,
          tempPassword
        };
      });
      
      return result;
    } catch (error) {
      console.error("Error onboarding madrassa:", error);
      throw error;
    }
  },

  async getAllMadrassas() {
    try {
      const q = query(collection(db, "madrassas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Madrassa));
    } catch (error) {
      console.error("Error fetching madrassas:", error);
      throw error;
    }
  },

  async getMadrassaById(id: string) {
    try {
      const docRef = doc(db, "madrassas", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Madrassa;
      }
      return null;
    } catch (error) {
      console.error("Error fetching madrassa:", error);
      throw error;
    }
  },

  async updateMadrassa(id: string, data: Partial<Madrassa>) {
    try {
      const docRef = doc(db, "madrassas", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error updating madrassa:", error);
      throw error;
    }
  },

  async updateMadrassaStatus(id: string, status: import("@/types/schema").Status) {
    try {
      const docRef = doc(db, "madrassas", id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error updating madrassa status:", error);
      throw error;
    }
  },

  async completeSetup(madrassaId: string, updatedBy: string) {
    try {
      const docRef = doc(db, "madrassas", madrassaId);
      await updateDoc(docRef, {
        isSetupComplete: true,
        updatedAt: Timestamp.now(),
        updatedBy
      });
    } catch (error) {
      console.error("Error completing setup:", error);
      throw error;
    }
  },

  async uploadLogo(madrassaId: string, file: File) {
    try {
      const url = await uploadToCloudinary(file);

      const docRef = doc(db, "madrassas", madrassaId);
      await updateDoc(docRef, {
        logoUrl: url,
        updatedAt: Timestamp.now()
      });

      return url;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    }
  },

  async getPlatformStats() {
    try {
      const madrassasRef = collection(db, "madrassas");
      
      const totalPromise = getCountFromServer(madrassasRef);
      const activePromise = getCountFromServer(query(madrassasRef, where("status", "==", "ACTIVE")));
      const suspendedPromise = getCountFromServer(query(madrassasRef, where("status", "==", "SUSPENDED")));
      
      // Grace period: subscriptionExpiry is in the past, but within last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();
      
      const gracePeriodPromise = getCountFromServer(
        query(
          madrassasRef, 
          where("subscriptionExpiry", "<", Timestamp.fromDate(now)),
          where("subscriptionExpiry", ">=", Timestamp.fromDate(sevenDaysAgo))
        )
      );

      const [totalSnap, activeSnap, suspendedSnap, gracePeriodSnap] = await Promise.all([
        totalPromise, activePromise, suspendedPromise, gracePeriodPromise
      ]);

      return {
        totalMadrassas: totalSnap.data().count,
        active: activeSnap.data().count,
        gracePeriod: gracePeriodSnap.data().count,
        suspended: suspendedSnap.data().count,
      };
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      throw error;
    }
  },

  async getExpiringMadrassas() {
    try {
      const madrassasRef = collection(db, "madrassas");
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const now = new Date();

      const q = query(
        madrassasRef,
        where("subscriptionExpiry", ">", Timestamp.fromDate(now)),
        where("subscriptionExpiry", "<=", Timestamp.fromDate(nextWeek)),
        orderBy("subscriptionExpiry", "asc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Madrassa));
    } catch (error) {
      console.error("Error fetching expiring madrassas:", error);
      throw error;
    }
  },

  async getRecentActivity() {
    try {
      const auditLogsRef = collection(db, "auditLogs");
      const q = query(auditLogsRef, orderBy("createdAt", "desc"), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw error;
    }
  },

  async getSubscriptionPlans() {
    try {
      const plansRef = collection(db, "subscriptionPlans");
      const snapshot = await getDocs(plansRef);
      
      const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformSubscriptionPlan));
      
      // If no plans exist yet, return some defaults so the UI works until the Settings page is built
      if (plans.length === 0) {
        return [
          { id: "trial", name: "Trial", amount: 0, studentLimit: 50, isTrial: true, trialDays: 30 },
          { id: "basic", name: "Basic", amount: 1000, studentLimit: 150, isTrial: false },
          { id: "pro", name: "Pro", amount: 2500, studentLimit: 500, isTrial: false },
          { id: "enterprise", name: "Enterprise", amount: 5000, studentLimit: 'Unlimited', isTrial: false },
        ] as PlatformSubscriptionPlan[];
      }
      
      return plans;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      throw error;
    }
  }
};

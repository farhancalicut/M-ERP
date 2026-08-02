import { db } from "@/lib/firebase/firestore";
import { collection, doc, setDoc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { PlatformSubscriptionPlan } from "@/types/schema";

export const settingsService = {
  async getSubscriptionPlans() {
    try {
      const plansRef = collection(db, "subscriptionPlans");
      const snapshot = await getDocs(plansRef);
      
      const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformSubscriptionPlan));
      
      return plans;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      throw error;
    }
  },

  async saveSubscriptionPlan(data: Partial<PlatformSubscriptionPlan>, id?: string) {
    try {
      if (id) {
        const docRef = doc(db, "subscriptionPlans", id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
        return id;
      } else {
        const newDocRef = doc(collection(db, "subscriptionPlans"));
        await setDoc(newDocRef, {
          ...data,
          createdAt: Timestamp.now(),
        });
        return newDocRef.id;
      }
    } catch (error) {
      console.error("Error saving subscription plan:", error);
      throw error;
    }
  },

  async getBoards() {
    try {
      const boardsRef = collection(db, "boards");
      const snapshot = await getDocs(boardsRef);
      
      const boards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      return boards;
    } catch (error) {
      console.error("Error fetching boards:", error);
      throw error;
    }
  },

  async saveBoard(data: any, id?: string) {
    try {
      if (id) {
        const docRef = doc(db, "boards", id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
        return id;
      } else {
        const newDocRef = doc(collection(db, "boards"));
        await setDoc(newDocRef, {
          ...data,
          createdAt: Timestamp.now(),
        });
        return newDocRef.id;
      }
    } catch (error) {
      console.error("Error saving board:", error);
      throw error;
    }
  }
};

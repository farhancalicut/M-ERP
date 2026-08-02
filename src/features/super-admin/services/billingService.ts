import { db } from "@/lib/firebase/firestore";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  Timestamp,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { PlatformInvoice, PlatformInvoiceStatus } from "@/types/schema";

const COLLECTION = "platformInvoices";

export const billingService = {
  async getAllInvoices() {
    try {
      // In-memory sort to avoid requiring a composite index if we add filters later
      const q = query(collection(db, COLLECTION));
      const snapshot = await getDocs(q);
      
      const invoices = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as PlatformInvoice)
      );

      // Sort by createdAt descending
      invoices.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      return invoices;
    } catch (error) {
      console.error("Error fetching platform invoices:", error);
      throw error;
    }
  },

  async createInvoice(
    data: Omit<PlatformInvoice, "id" | "status" | "createdAt" | "createdBy">,
    createdByUid: string
  ) {
    try {
      const docRef = doc(collection(db, COLLECTION));
      const invoice: PlatformInvoice = {
        ...data,
        id: docRef.id,
        status: "PENDING",
        createdAt: serverTimestamp() as any,
        createdBy: createdByUid,
      };

      await setDoc(docRef, invoice);
      return invoice;
    } catch (error) {
      console.error("Error creating platform invoice:", error);
      throw error;
    }
  },

  async updateInvoiceStatus(id: string, status: PlatformInvoiceStatus, updatedBy: string) {
    try {
      const docRef = doc(db, COLLECTION, id);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
        updatedBy,
      };

      if (status === "PAID") {
        updateData.paidAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Error updating platform invoice status:", error);
      throw error;
    }
  },

  async deleteInvoice(id: string) {
    // Usually invoices shouldn't be hard-deleted, but just in case
    try {
      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error cancelling platform invoice:", error);
      throw error;
    }
  }
};

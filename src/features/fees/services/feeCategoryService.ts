import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  serverTimestamp,
  QueryDocumentSnapshot,
  writeBatch,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { FeeCategory } from "@/types/schema";
import { Status, FeeType } from "@/types/enums";

const COLLECTION = "feeCategories";

export const feeCategoryService = {
  createFeeCategory: async (
    madrassaId: string,
    data: Omit<FeeCategory, "id" | "status" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt">,
    createdBy: string
  ): Promise<FeeCategory> => {
    const docRef = doc(collection(db, COLLECTION));
    
    const feeCategory: FeeCategory = {
      ...data,
      id: docRef.id,
      madrassaId,
      status: "ACTIVE",
      createdBy,
      createdAt: serverTimestamp() as any,
      updatedBy: createdBy,
      updatedAt: serverTimestamp() as any,
    };

    const batch = writeBatch(db);
    batch.set(docRef, feeCategory);
    await batch.commit();

    return feeCategory;
  },

  updateFeeCategory: async (
    id: string,
    data: Partial<Omit<FeeCategory, "id" | "madrassaId" | "createdAt" | "createdBy">>,
    updatedBy: string
  ): Promise<void> => {
    const docRef = doc(db, COLLECTION, id as string);
    const batch = writeBatch(db);
    batch.update(docRef, {
      ...data,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  },

  archiveFeeCategory: async (id: string, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id as string);
    const batch = writeBatch(db);
    batch.update(docRef, {
      status: "ARCHIVED" as Status,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  },

  deleteFeeCategory: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  getFeeCategory: async (id: string): Promise<FeeCategory | null> => {
    const docRef = doc(db, COLLECTION, id as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FeeCategory;
    }
    return null;
  },

  getFeeCategories: async (
    madrassaId: string,
    filters?: {
      status?: Status;
      feeType?: FeeType;
    },
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot | null
  ): Promise<{ categories: FeeCategory[]; lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [where("madrassaId", "==", madrassaId)];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters?.feeType) {
      constraints.push(where("feeType", "==", filters.feeType));
    }

    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);

    const categories = snap.docs.map(doc => doc.data() as FeeCategory);
    
    // Sort in memory by createdAt descending
    categories.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis?.() || 0;
      const timeB = (b.createdAt as any)?.toMillis?.() || 0;
      return timeB - timeA;
    });
    
    return {
      categories,
      lastDoc: snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] || null) : null
    };
  }
};

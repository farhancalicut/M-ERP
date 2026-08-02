import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Notice } from "@/types/schema";

const COLLECTION = "notices";

export const noticeService = {
  getNotices: async (
    madrassaId: string,
    filters?: {
      status?: Notice['status'];
      targetRoles?: string[];
      pinned?: boolean;
    },
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ) => {
    let constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("expiryDate", ">=", Timestamp.now())
    ];

    if (filters?.status) constraints.push(where("status", "==", filters.status));
    if (filters?.targetRoles && filters.targetRoles.length > 0) {
      constraints.push(where("targetRoles", "array-contains-any", filters.targetRoles));
    }
    if (filters?.pinned !== undefined) constraints.push(where("pinned", "==", filters.pinned));

    constraints.push(orderBy("expiryDate", "asc")); // Need to order by filter field first
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return {
      notices: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice)),
      lastDoc: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined
    };
  },

  getNotice: async (id: string): Promise<Notice | null> => {
    const docRef = doc(db, COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Notice;
  },

  createNotice: async (data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  updateNotice: async (id: string, data: Partial<Notice>) => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  publishNotice: async (id: string, publishedBy: string) => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      status: "PUBLISHED",
      publishedBy,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  archiveNotice: async (id: string, updatedBy: string) => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      status: "ARCHIVED",
      updatedBy,
      updatedAt: serverTimestamp(),
    });
  }
};

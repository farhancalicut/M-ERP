import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Parent } from "../types";

const COLLECTION = "parents";

export const parentService = {
  getParent: async (parentId: string): Promise<Parent | null> => {
    const docRef = doc(db, COLLECTION, parentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Parent;
    }
    return null;
  },

  getParentByMobile: async (madrassaId: string, mobile: string): Promise<Parent | null> => {
    const mobileKey = `${madrassaId}_${mobile}`;
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("mobileKey", "==", mobileKey),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && snapshot.docs[0]) {
      const parentData = snapshot.docs[0].data() as Parent;
      
      // Attempt to fetch email from users or pendingUsers if not present
      if (!parentData.email) {
        let parentEmail = "";
        try {
          const userDoc = await getDoc(doc(db, "users", parentData.userId));
          if (userDoc.exists() && userDoc.data().email) {
            parentEmail = userDoc.data().email;
          } else {
            // Check pendingUsers where doc ID might be email or they might have an entry
            const pendingQ = query(collection(db, "pendingUsers"), where("userId", "==", parentData.userId), limit(1));
            const pendingSnap = await getDocs(pendingQ);
            if (!pendingSnap.empty) {
               parentEmail = pendingSnap.docs[0]!.data().email;
            }
          }
        } catch (e) {
          console.error("Error fetching parent email", e);
        }
        
        parentData.email = parentEmail;
      }
      return parentData;
    }
    return null;
  },

  searchParents: async (
    madrassaId: string,
    filters: { search?: string } = {},
    pageSize: number = 50
  ): Promise<{ parents: Parent[] }> => {
    // Simple implementation for fetching parents by madrassaId
    // If search is needed, we could filter client-side or use a more complex query
    const constraints = [
      where("madrassaId", "==", madrassaId),
      limit(pageSize)
    ];

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    let parents = snapshot.docs.map(doc => doc.data() as Parent);
    
    // basic client-side filtering if name/mobile search provided
    if (filters.search) {
      const s = filters.search.toLowerCase();
      parents = parents.filter(p => 
        (p.fatherName && p.fatherName.toLowerCase().includes(s)) ||
        (p.motherName && p.motherName.toLowerCase().includes(s)) ||
        (p.mobile && p.mobile.includes(s))
      );
    }
    
    return { parents };
  },

  updateParent: async (parentId: string, data: Partial<Parent>): Promise<void> => {
    const docRef = doc(db, COLLECTION, parentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  softDeleteParent: async (parentId: string, deletedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, parentId);
    await updateDoc(docRef, {
      status: 'DELETED',
      deletedAt: serverTimestamp(),
      deletedBy,
      updatedAt: serverTimestamp()
    });
  }
};

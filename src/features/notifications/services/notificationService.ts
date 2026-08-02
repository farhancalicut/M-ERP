import {
  collection,
  doc,
  getDocs,
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
import { Notification } from "@/types/schema";

const COLLECTION = "notifications";

export const notificationService = {
  getNotifications: async (
    madrassaId: string,
    uid: string,
    roles: string[],
    classId?: string,
    studentIds?: string[],
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ) => {
    let constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("status", "==", "ACTIVE"),
      where("expiresAt", ">=", Timestamp.now())
    ];

    // Need to order by filter field first
    constraints.push(orderBy("expiresAt", "asc"));
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    // Filter locally to match OR conditions, since Firestore limits OR queries.
    // A user gets notifications if ReceiverType is ALL, or matching their Role, or matching their Class, or matching their UID/StudentID.
    const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    
    const filtered = allDocs.filter(n => {
      if (n.receiverType === 'ALL') return true;
      if (roles.includes(n.receiverType)) return true;
      if (n.receiverType === 'CLASS' && classId && n.receiverIds?.includes(classId)) return true;
      if (n.receiverType === 'USER' && n.receiverIds?.includes(uid)) return true;
      if (n.receiverType === 'STUDENT' && studentIds && n.receiverIds?.some(sid => studentIds.includes(sid))) return true;
      return false;
    });

    return {
      notifications: filtered,
      lastDoc: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined
    };
  },

  createNotification: async (data: Omit<Notification, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  markAsReadInFirestore: async (id: string, uid: string, existingReadBy: string[] = []) => {
    if (existingReadBy.includes(uid)) return;
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      readBy: [...existingReadBy, uid]
    });
  }
};

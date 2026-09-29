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

/** Default notification expiry: 30 days from now */
const defaultExpiresAt = () =>
  Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

export const notificationService = {
  /**
   * Fetch notifications for a user.
   * Strategy (cost-efficient):
   *  - Query by madrassaId + status=ACTIVE, order by createdAt desc, limit 25.
   *  - Filter locally for receiver targeting since Firestore can't do OR queries.
   *  - No real-time listener — caller triggers this on mount or dropdown open.
   */
  getNotifications: async (
    madrassaId: string,
    uid: string,
    roles: string[],
    classId?: string,
    studentIds?: string[],
    pageSize: number = 25,
    lastDoc?: QueryDocumentSnapshot
  ) => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("status", "==", "ACTIVE"),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    ];

    if (lastDoc) constraints.push(startAfter(lastDoc));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const allDocs = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Notification)
    );

    // Local filter for receiver targeting (avoids expensive OR queries)
    const filtered = allDocs.filter((n) => {
      if (n.receiverType === "ALL") return true;
      if (roles.includes(n.receiverType)) return true;
      if (
        n.receiverType === "CLASS" &&
        classId &&
        n.receiverIds?.includes(classId)
      )
        return true;
      if (n.receiverType === "USER" && n.receiverIds?.includes(uid))
        return true;
      if (
        n.receiverType === "STUDENT" &&
        studentIds &&
        n.receiverIds?.some((sid) => studentIds.includes(sid))
      )
        return true;
      return false;
    });

    return {
      notifications: filtered,
      lastDoc:
        snapshot.docs.length === pageSize
          ? snapshot.docs[snapshot.docs.length - 1]
          : undefined,
    };
  },

  /**
   * Create a notification. Wraps addDoc with safe defaults.
   * Non-throwing — caller should handle failures gracefully.
   */
  createNotification: async (
    data: Omit<Notification, "id" | "createdAt" | "updatedAt">
  ) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      readBy: data.readBy ?? [],
      expiresAt: data.expiresAt ?? defaultExpiresAt(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Safe wrapper — logs but does NOT throw, so callers don't need try/catch.
   */
  createNotificationSafe: async (
    data: Omit<Notification, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      return await notificationService.createNotification(data);
    } catch (err) {
      console.warn("[NotificationService] Failed to create notification:", err);
      return null;
    }
  },

  /**
   * Mark a single notification as read in Firestore (for USER/STUDENT-targeted).
   * For ALL/ROLE/CLASS notifications, use localStorage instead (zero cost).
   */
  markAsReadInFirestore: async (
    id: string,
    uid: string,
    existingReadBy: string[] = []
  ) => {
    if (existingReadBy.includes(uid)) return; // already read
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      readBy: [...existingReadBy, uid],
    });
  },
};

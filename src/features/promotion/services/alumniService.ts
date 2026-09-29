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
  serverTimestamp,
  QueryDocumentSnapshot,
  Timestamp,
  QueryConstraint,
  Transaction,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Alumni, PendingUser } from "@/types/schema";
import { Status } from "@/types/enums";
import { generateTemporaryPassword, hashPassword } from "@/features/auth/utils/crypto";

const COLLECTION = "alumni";

export const alumniService = {

  /**
   * Get paginated list of alumni
   */
  getAlumniList: async (
    madrassaId: string,
    filters?: {
      completionYear?: number;
      status?: Status;
      name?: string;
    },
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ alumni: Alumni[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (filters?.status) constraints.push(where("status", "==", filters.status));
    if (filters?.completionYear) constraints.push(where("completionYear", "==", filters.completionYear));
    if (filters?.name) {
      // Simple prefix search if name is provided. Assuming uppercase/lowercase match handled in UI or exactly.
      constraints.push(
        where("name", ">=", filters.name),
        where("name", "<=", filters.name + '\uf8ff')
      );
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);

    const alumni: Alumni[] = [];
    snap.forEach(doc => {
      alumni.push({ id: doc.id, ...doc.data() } as Alumni);
    });

    return {
      alumni,
      lastDoc: snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] || null) : null
    };
  },

  getAlumniProfile: async (id: string): Promise<Alumni | null> => {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Alumni;
  },

  updateAlumniStatus: async (id: string, status: Status, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy
    });
  },

  /**
   * Creates an alumni account and pending user. 
   * This is designed to be called inside a transaction by promotionService.
   */
  createAlumniInTransaction: async (
    transaction: Transaction,
    madrassaId: string,
    student: { id: string; parentId?: string; admissionNo?: string; name: string; mobile?: string; email?: string; classId: string },
    completionYear: number,
    createdByUid: string,
    alumniCounter: number,
    pendingUserExists: boolean
  ): Promise<{ alumni: Omit<Alumni, "id">, credentials: { userId: string, password?: string } }> => {

    // 1. Generate ID
    const paddedCount = String(alumniCounter).padStart(4, '0');
    const alumniId = `ALM${completionYear}${paddedCount}`; // e.g. ALM20260001

    const loginId = student.admissionNo ? `ALM_${student.admissionNo}` : alumniId;

    // Let's use the loginId as the document ID for pendingUsers!
    const pendingUserRef = doc(db, "pendingUsers", loginId.toLowerCase());

    // If pending user exists, we don't recreate credentials. 
    let password = undefined;

    const alumniDocRef = doc(collection(db, COLLECTION));

    if (!pendingUserExists) {
      // Create credentials
      password = generateTemporaryPassword();
      const { salt, hash, iterations } = await hashPassword(password);

      const pendingUser: PendingUser = {
        id: alumniDocRef.id,
        userId: loginId,
        role: "ALUMNI",
        name: student.name,
        mobile: student.mobile || "", // From parent or student doc
        generatedEmail: `${loginId.toLowerCase()}@${madrassaId.toLowerCase()}.m-erp.local`,
        email: `${loginId.toLowerCase()}@${madrassaId.toLowerCase()}.m-erp.local`,
        passwordHash: hash,
        salt,
        iterations,
        createdBy: createdByUid,
        madrassaId,
        status: "PENDING",
        createdAt: serverTimestamp() as unknown as Timestamp,
        updatedAt: serverTimestamp() as unknown as Timestamp,
        updatedBy: createdByUid
      };
      transaction.set(pendingUserRef, pendingUser);
    }

    const alumniData: Omit<Alumni, "id"> = {
      alumniId,
      studentId: student.id as string,
      userId: loginId, // this is the ID they use to log in
      admissionNo: student.admissionNo || "",
      name: student.name,
      mobile: student.mobile || "", // if you have it
      email: student.email || "",
      completionYear: completionYear.toString(),
      graduatedYearId: completionYear.toString(),
      madrassaId,
      status: "ACTIVE",
      createdAt: serverTimestamp() as unknown as Timestamp,
      createdBy: createdByUid,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      updatedBy: createdByUid
    };

    transaction.set(alumniDocRef, alumniData);

    const credentials: { userId: string, password?: string } = { userId: loginId };
    if (password) {
      credentials.password = password;
    }

    return {
      alumni: alumniData,
      credentials
    };
  }
};

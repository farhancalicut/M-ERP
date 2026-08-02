import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { User } from "@/types/schema";
import { Role } from "@/types/enums";

export const userService = {
  async getCurrentUser(uid: string): Promise<User | null> {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, uid: snap.id, ...snap.data() } as User;
  },
  
  async createUserDocument(uid: string, user: User): Promise<void> {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, user);
  },

  async getUsersByRole(madrassaId: string, role: Role): Promise<User[]> {
    const q = query(
      collection(db, "users"),
      where("madrassaId", "==", madrassaId),
      where("role", "==", role),
      where("status", "==", "ACTIVE")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
};

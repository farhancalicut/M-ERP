import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { PendingUser } from "@/types/schema";
import { hashPassword } from "../utils/crypto";
import { Role } from "@/types/enums";

export const pendingUserService = {
  async createPendingUser(
    madrassaId: string, 
    userId: string, 
    role: Role, 
    name: string, 
    temporaryPasswordPlain: string,
    createdBy: string,
    mobile?: string
  ): Promise<void> {
    const { hash, salt, iterations } = await hashPassword(temporaryPasswordPlain);
    const generatedEmail = `${userId.toLowerCase()}@${madrassaId.toLowerCase()}.local`;
    
    const pendingUser: PendingUser = {
      id: userId,
      madrassaId,
      userId,
      role,
      name,
      email: generatedEmail,
      ...(mobile ? { mobile } : {}),
      generatedEmail,
      passwordHash: hash,
      salt,
      iterations,
      createdBy,
      updatedBy: createdBy,
      status: 'ACTIVE',
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp
    };

    const docRef = doc(db, "pendingUsers", userId);
    await setDoc(docRef, pendingUser);
  }
};

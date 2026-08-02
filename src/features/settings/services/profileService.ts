import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { User } from "@/types/schema";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const profileService = {
  async getProfile(userId: string): Promise<User | null> {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  },

  async updateProfile(userId: string, data: Partial<Pick<User, "displayName" | "email" | "photoUrl">>): Promise<void> {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });

    // Also update Firebase Auth profile if displayName or photoUrl changed
    const currentUser = auth.currentUser;
    if (currentUser && (data.displayName || data.photoUrl)) {
      await updateAuthProfile(currentUser, {
        displayName: data.displayName ?? null,
        photoURL: data.photoUrl ?? null
      });
    }
  },

  async changePassword(newPassword: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in");
    await updatePassword(currentUser, newPassword);
  },

  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const downloadUrl = await uploadToCloudinary(file);
    
    await this.updateProfile(userId, { photoUrl: downloadUrl });
    return downloadUrl;
  }
};


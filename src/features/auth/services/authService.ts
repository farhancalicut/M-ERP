import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { PendingUser, User } from "@/types/schema";
import { verifyPassword } from "../utils/crypto";
import { LoginPayload, FirstLoginPayload } from "../types/auth";
import { getDefaultPermissions } from "../utils/permissions";
import { AppError } from "@/lib/errors/AppError";

export const authService = {
  async login({ email, password }: { email?: string; password?: string }) {
    if (!email || !password) throw new AppError("Email and password are required");
    
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // Self-heal missing userId for existing activated accounts
      try {
        const userDocRef = doc(db, "users", userCred.user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (!data.userId && (data.role === 'ALUMNI' || data.role === 'TEACHER' || data.role === 'PARENT')) {
            await updateDoc(userDocRef, { userId: data.pendingUserId || email.toLowerCase() });
          }
        }
      } catch (e) {
        console.error("Failed to self-heal userId:", e);
      }
      
      return userCred;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-email') {
        // Check if they are a pending user
        const pendingRef = doc(db, "pendingUsers", email.toLowerCase());
        const pendingSnap = await getDoc(pendingRef);
        
        if (pendingSnap.exists()) {
          const pendingData = pendingSnap.data() as PendingUser;
          let isValid = false;

          // Verify their temporary password
          if (pendingData.passwordHash && pendingData.salt) {
            isValid = await verifyPassword(
              password, 
              pendingData.passwordHash, 
              pendingData.salt, 
              pendingData.iterations!
            );
          } else if ((pendingData as any).tempPassword) {
            isValid = (pendingData as any).tempPassword === password;
          }

          if (isValid) {
            // They need to activate their account by setting a new password
            const activationError: any = new Error("Activation Required");
            activationError.code = 'auth/requires-new-password';
            activationError.email = email;
            activationError.temporaryPassword = password;
            throw activationError;
          }
        }
      }
      
      throw new AppError("Invalid credentials or account inactive.");
    }
  },

  async logout() {
    return await signOut(auth);
  },

  async firstLogin({ email, personalEmail, temporaryPassword, newPassword }: { email: string; personalEmail?: string; temporaryPassword?: string; newPassword?: string }) {
    if (!email || !temporaryPassword || !newPassword) {
      throw new AppError("All fields are required");
    }
    
    // 1. Verify pending user
    const pendingRef = doc(db, "pendingUsers", email.toLowerCase());
    const pendingSnap = await getDoc(pendingRef);
    
    if (!pendingSnap.exists()) {
      throw new AppError("Pending user not found or already activated");
    }
    
    const pendingData = pendingSnap.data() as PendingUser;

    let isValid = false;

    // Support both hashed and legacy plaintext temporary passwords
    if (pendingData.passwordHash && pendingData.salt) {
      isValid = await verifyPassword(
        temporaryPassword, 
        pendingData.passwordHash, 
        pendingData.salt, 
        pendingData.iterations!
      );
    } else if ((pendingData as any).tempPassword) {
      isValid = (pendingData as any).tempPassword === temporaryPassword;
    }

    if (!isValid) {
      throw new AppError("Invalid temporary password");
    }

    // 2. Create Firebase Auth account
    const firebaseEmail = personalEmail || pendingData.email || email;
    const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, newPassword);
    const firebaseUser = userCredential.user;

    try {
      // 3. Create users/{uid}
      const newUser: User = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        displayName: pendingData.name || "Unknown",
        madrassaId: pendingData.madrassaId,
        email: firebaseEmail,
        role: pendingData.role,
        subscriptionStatus: 'ACTIVE', 
        permissions: getDefaultPermissions(pendingData.role),
        status: 'ACTIVE',
        isActive: true,
        createdBy: pendingData.createdBy || 'SYSTEM',
        updatedBy: firebaseUser.uid,
        createdAt: serverTimestamp() as unknown as Timestamp,
        updatedAt: serverTimestamp() as unknown as Timestamp,
        contactNumber: pendingData.contactNumber || "",
        qualification: pendingData.qualification || "",
        specialization: pendingData.specialization || "",
        joiningDate: pendingData.joiningDate || undefined,
        address: pendingData.address || "",
        bloodGroup: pendingData.bloodGroup || "",
        identityMarks: pendingData.identityMarks || "",
      };
      
      // Remove any keys that are still undefined just in case
      Object.keys(newUser).forEach(key => {
        if ((newUser as any)[key] === undefined) {
          delete (newUser as any)[key];
        }
      });

      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...newUser,
          userId: pendingData.userId || pendingData.email || email.toLowerCase(),
          pendingUserId: email.toLowerCase(),
          domainId: pendingData.id || ""
        });
        
        // Link the newly created auth uid back to the domain document
        if (pendingData.id) {
          if (pendingData.role === "PARENT") {
            try {
              await updateDoc(doc(db, "parents", pendingData.id), { userId: firebaseUser.uid });
            } catch (e) { console.error("Failed to link parent domain doc", e); }
          } else if (pendingData.role === "ALUMNI") {
            try {
              await updateDoc(doc(db, "alumni", pendingData.id), { userId: firebaseUser.uid, email: firebaseEmail });
            } catch (e) { console.error("Failed to link alumni domain doc", e); }
          }
        }
      } catch (err) {
        console.error("Failed at setDoc(users):", err);
        throw err;
      }

      // 4. Delete pendingUsers document
      try {
        await deleteDoc(pendingRef);
      } catch (err) {
        console.error("Failed at deleteDoc(pendingUsers):", err);
        throw err;
      }
      
      // 4.5 If a baseSalary was provided during staff creation, configure the salary structure now
      if (pendingData.baseSalary !== undefined) {
        try {
          const { salaryService } = await import("@/features/finance/services/salaryService");
          await salaryService.updateSalaryStructure(pendingData.madrassaId, firebaseUser.uid, {
            baseSalary: pendingData.baseSalary,
            defaultAllowances: [],
            defaultDeductions: [],
            netSalary: pendingData.baseSalary
          });
        } catch (err) {
          console.error("Failed to setup initial salary structure:", err);
          // Non-fatal, so we don't throw
        }
      }

      // 5. Update authStore so AuthProvider doesn't need to re-fetch
      const { useAuthStore } = await import("@/stores/authStore");
      useAuthStore.getState().setUser(firebaseUser, newUser, null);
      
      return firebaseUser;
    } catch (error: any) {
      console.error("Activation Error:", error);
      // Rollback: Delete the created Auth user if Firestore fails
      if (auth.currentUser?.uid === firebaseUser.uid) {
        await deleteFirebaseUser(auth.currentUser).catch(console.error);
      }
      
      // Attempt to clean up the users document in case the failure was on pending user deletion
      await deleteDoc(doc(db, "users", firebaseUser.uid)).catch(console.error);
      
      throw new AppError("Failed to complete activation. Please try again.");
    }
  }
};

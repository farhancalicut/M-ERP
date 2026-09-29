import { db } from "@/lib/firebase/firestore";
import { collection, doc, setDoc, query, where, getDocs, getDoc, updateDoc, Timestamp, runTransaction, deleteField } from "firebase/firestore";
import { User } from "@/types/schema";
import { Role } from "@/types/enums";
import { hashPassword } from "@/features/auth/utils/crypto";

export interface OnboardStaffData {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  role: Role;
  assignedClassIds?: string[] | undefined;
  qualification?: string | undefined;
  specialization?: string | undefined;
  joiningDate?: Date | undefined;
  address?: string | undefined;
  bloodGroup?: string | undefined;
  identityMarks?: string | undefined;
}

export const staffService = {
  async onboardStaff(data: OnboardStaffData, madrassaId: string, createdByUid: string) {
    // Generate Temporary Credentials
    const tempPassword = Math.random().toString(36).slice(-8);
    const { hash, salt, iterations } = await hashPassword(tempPassword);
    
    // Create Pending User Record using Email as ID
    const pendingUserRef = doc(db, "pendingUsers", data.email.toLowerCase());
    
    const pendingData: any = {
      email: data.email,
      passwordHash: hash,
      salt,
      iterations,
      role: data.role,
      madrassaId: madrassaId,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`.trim(),
      contactNumber: data.contactNumber,
      qualification: data.qualification || "",
      specialization: data.specialization || "",
      joiningDate: data.joiningDate ? Timestamp.fromDate(data.joiningDate) : Timestamp.now(),
      address: data.address || "",
      bloodGroup: data.bloodGroup || "",
      identityMarks: data.identityMarks || "",
      createdAt: Timestamp.now(),
      createdBy: createdByUid,
      isUsed: false
    };

    if (data.assignedClassIds && data.assignedClassIds.length > 0) {
      pendingData.assignedClassIds = data.assignedClassIds;
    }

    await setDoc(pendingUserRef, pendingData);

    return {
      email: data.email,
      tempPassword
    };
  },

  async getStaffMembers(madrassaId: string) {
    const q = query(
      collection(db, "users"),
      where("madrassaId", "==", madrassaId),
      where("role", "in", ["PRINCIPAL", "TEACHER"])
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as User);
  },

  async getStaffById(uid: string): Promise<User | null> {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as User;
  },

  async updateStaff(uid: string, updates: Partial<User>) {
    const docRef = doc(db, "users", uid);
    
    let madrassaId = "";
    let statChange = 0;
    
    await runTransaction(db, async (transaction) => {
      const staffDoc = await transaction.get(docRef);
      if (!staffDoc.exists()) return;
      
      const staffData = staffDoc.data() as User;
      madrassaId = staffData.madrassaId;
      
      const wasActive = staffData.isActive;
      const isNowActive = updates.isActive !== undefined ? updates.isActive : wasActive;
      
      // If becoming inactive, fetch assigned classes to remove teacher role
      const classDocsToUpdate = [];
      if (wasActive && !isNowActive && staffData.assignedClassIds && staffData.assignedClassIds.length > 0) {
        for (const cid of staffData.assignedClassIds) {
           classDocsToUpdate.push(await transaction.get(doc(db, "classes", cid)));
        }
      }
      
      transaction.update(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      if (wasActive && !isNowActive) {
        statChange = -1;
        // Also remove them from being class teacher of any classes they were assigned to
        for (const cDoc of classDocsToUpdate) {
           if (cDoc.exists() && cDoc.data().classTeacherId === uid) {
              transaction.update(cDoc.ref, { classTeacherId: deleteField() });
           }
        }
        // Also clear their own assignedClassIds array
        transaction.update(docRef, { assignedClassIds: [] });
      } else if (!wasActive && isNowActive) {
        statChange = 1;
      }
    });

    if (madrassaId && statChange !== 0) {
      import("@/features/reports/services/dashboardService").then(({ dashboardService }) => {
         dashboardService.updateStatCounter(madrassaId, "totalTeachers", statChange).catch(console.error);
      });
    }
  }
};

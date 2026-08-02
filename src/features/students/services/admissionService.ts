import { doc, runTransaction, serverTimestamp, Timestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Student, Parent } from "../types";
import { counterService } from "@/services/counterService";
import { hashPassword } from "@/features/auth/utils/crypto";
import { PendingUser } from "@/types/schema";
import { parentService } from "./parentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { Gender, Relationship } from "@/types/enums";
import { dashboardService } from "@/features/reports/services/dashboardService";

export interface AdmissionData {
  madrassaId: string;
  classId: string;
  name: string;
  gender: Gender;
  dob: Date;
  admissionDate: Date;
  photoUrl?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  identityMark?: string;
  majorAchievements?: string;
  address: string;
  guardianRelation: Relationship;
  fatherName: string;
  motherName: string;
  parentMobile: string;
  parentEmail: string;
  admissionFeeAmount?: number;
  admissionFeePaymentMethod?: "CASH" | "BANK" | "UPI" | "OTHER" | "PENDING";
}

export const admissionService = {
  admitStudent: async (data: AdmissionData) => {
    const { madrassaId, parentMobile } = data;
    const mobileKey = `${madrassaId}_${parentMobile}`;
    
    // Check if parent exists outside transaction (since queries inside transactions are restricted/costly if they fail)
    const existingParent = await parentService.getParentByMobile(madrassaId, parentMobile);

    const newStudentId = await counterService.generateNextId(madrassaId, 'STU');
    let parentId = existingParent?.parentId;
    let newParentCreds = null;
    let newParentId = null;

    if (!parentId) {
      newParentId = await counterService.generateNextId(madrassaId, 'PAR');
      parentId = newParentId;
      
      const charSet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let password = "";
      for (let i = 0; i < 8; i++) {
        password += charSet.charAt(Math.floor(Math.random() * charSet.length));
      }

      newParentCreds = {
        email: data.parentEmail,
        password
      };
    }

    let passwordHash = "";
    let passwordSalt = "";
    if (newParentCreds) {
       const { hash, salt } = await hashPassword(newParentCreds.password);
       passwordHash = hash;
       passwordSalt = salt;
    }

    // Fetch the active academic year
    const { academicYearService } = await import("@/features/academic/services/academicYearService");
    const { years } = await academicYearService.getAcademicYears(madrassaId, "ACTIVE", undefined, 1);
    const activeAcademicYear = years[0];
    const academicYearId = activeAcademicYear?.id || "unknown";

    const result = await runTransaction(db, async (transaction) => {
      const studentRef = doc(db, 'students', newStudentId);
      let parentSnap = null;
      
      if (existingParent) {
        const parentRef = doc(db, 'parents', existingParent.parentId);
        parentSnap = await transaction.get(parentRef);
        if (!parentSnap.exists()) {
          throw new Error("Parent document disappeared");
        }
      }

      let counterSnap = null;
      const counterRef = doc(db, "counters", `${madrassaId}_payments`);
      const isPaid = data.admissionFeeAmount && data.admissionFeeAmount > 0 && data.admissionFeePaymentMethod !== "PENDING";
      
      if (isPaid) {
        counterSnap = await transaction.get(counterRef);
      }
      
      let classSnap = null;
      if (data.classId) {
        const classRef = doc(db, 'classes', data.classId);
        classSnap = await transaction.get(classRef);
      }

      const studentData: Student = {
        studentId: newStudentId,
        admissionNo: newStudentId,
        madrassaId,
        parentId: parentId!,
        classId: data.classId,
        name: data.name,
        nameSearch: data.name.toLowerCase(),
        gender: data.gender,
        dob: Timestamp.fromDate(data.dob),
        admissionDate: Timestamp.fromDate(data.admissionDate),
        photoUrl: data.photoUrl || "",
        bloodGroup: data.bloodGroup || "",
        medicalNotes: data.medicalNotes || "",
        identityMark: data.identityMark || "",
        majorAchievements: data.majorAchievements || "",
        address: data.address,
        guardianRelation: data.guardianRelation,
        status: 'ACTIVE',
        isAlumniEligible: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      transaction.set(studentRef, studentData);

      let finalParent: Parent;

      if (existingParent && parentSnap) {
        const parentRef = doc(db, 'parents', existingParent.parentId);
        const currentData = parentSnap.data() as Parent;
        const currentStudentIds = currentData.studentIds || [];
        const newStudentCount = (currentData.studentCount || currentStudentIds.length) + 1;
        
        finalParent = {
          ...currentData,
          studentIds: [...currentStudentIds, newStudentId],
          studentCount: newStudentCount,
          lastActiveStudentId: newStudentId,
          updatedAt: Timestamp.now(), // Local reference for returned object
        };
        
        transaction.update(parentRef, {
          studentIds: finalParent.studentIds,
          studentCount: finalParent.studentCount,
          lastActiveStudentId: finalParent.lastActiveStudentId,
          updatedAt: serverTimestamp()
        });
      } else {
        const parentRef = doc(db, 'parents', parentId!);
        
        finalParent = {
          parentId: parentId!,
          userId: parentId!,
          madrassaId,
          fatherName: data.fatherName,
          motherName: data.motherName,
          mobile: parentMobile,
          mobileKey,
          address: data.address,
          studentIds: [newStudentId],
          studentCount: 1,
          status: 'ACTIVE',
          lastActiveStudentId: newStudentId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        transaction.set(parentRef, finalParent);

        if (newParentCreds) {
          const pendingUserRef = doc(db, 'pendingUsers', data.parentEmail.toLowerCase());
          const pendingData: PendingUser = {
            id: parentId!,
            userId: parentId!,
            madrassaId,
            role: 'PARENT',
            name: `${data.fatherName} & ${data.motherName}`,
            mobile: parentMobile,
            email: data.parentEmail.toLowerCase(),
            passwordHash,
            salt: passwordSalt,
            iterations: 100000,
            status: 'PENDING',
            contactNumber: parentMobile,
            address: data.address || "",
            bloodGroup: data.bloodGroup || "",
            createdAt: Timestamp.now(),
            createdBy: "SYSTEM",
            updatedAt: Timestamp.now(),
            updatedBy: "SYSTEM",
          };
          transaction.set(pendingUserRef, pendingData);
        }
      }
      
      if (classSnap && classSnap.exists()) {
        const classRef = doc(db, 'classes', data.classId);
        const currentStrength = classSnap.data().currentStrength || 0;
        transaction.update(classRef, { currentStrength: currentStrength + 1 });
      }

      const initialFees = [];
      if (data.admissionFeeAmount && data.admissionFeeAmount > 0) {
        const assignedFeeId = `FEE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const isPaid = data.admissionFeePaymentMethod !== "PENDING";
        initialFees.push({
          id: assignedFeeId,
          feeCategoryId: "ADMISSION_FEE_GEN",
          feeName: "Admission Fee",
          amount: data.admissionFeeAmount,
          paidAmount: isPaid ? data.admissionFeeAmount : 0,
          dueAmount: isPaid ? 0 : data.admissionFeeAmount,
          status: (isPaid ? "PAID" : "PENDING") as any,
          assignedAt: Timestamp.now(),
        });

        if (isPaid) {
          // Generate payment number
          let currentCounter = 0;
          if (counterSnap && counterSnap.exists()) {
            currentCounter = counterSnap.data().count || 0;
          }
          const newCounter = currentCounter + 1;
          const paymentNo = `RCT-${String(newCounter).padStart(6, '0')}`;
          transaction.set(counterRef, { count: newCounter });

          // Record payment directly if they paid immediately
          const paymentRef = doc(collection(db, 'feePayments'));
          transaction.set(paymentRef, {
            id: paymentRef.id,
            paymentNo,
            receiptNo: paymentNo,
            madrassaId,
            studentId: newStudentId,
            parentId: parentId!,
            academicYearId,
            feeCategoryId: "ADMISSION_FEE_GEN",
            assignedFeeId,
            amount: data.admissionFeeAmount,
            paymentMethod: data.admissionFeePaymentMethod,
            paymentDate: Timestamp.now(),
            status: "ACTIVE",
            collectedBy: "SYSTEM",
            createdAt: Timestamp.now()
          });
        }
      }

      await studentFeeService.initializeStudentFee(
        madrassaId,
        newStudentId,
        parentId!,
        academicYearId,
        0, // default monthly fee
        initialFees,
        transaction
      );

      return { student: studentData, parent: finalParent, isNewParent: !existingParent };
    });

    // Update counters without blocking the main transaction
    dashboardService.updateStatCounter(madrassaId, "totalStudents", 1).catch(console.error);
    if (result.isNewParent) {
      dashboardService.updateStatCounter(madrassaId, "totalParents", 1).catch(console.error);
    }

    return {
      student: result.student,
      parent: result.parent,
      credentials: newParentCreds
    };
  }
};

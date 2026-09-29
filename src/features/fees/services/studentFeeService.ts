import {
  doc,
  getDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  Transaction,
  Timestamp,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { StudentFee, AssignedFee, FeeCategory } from "@/types/schema";
import { FeeStatus } from "@/types/enums";

const COLLECTION = "studentFees";

export const studentFeeService = {
  /**
   * Initializes a student fee document.
   * Can be used standalone or inside a transaction (e.g. during admission or promotion).
   */
  initializeStudentFee: async (
    madrassaId: string,
    studentId: string,
    parentId: string,
    academicYearId: string,
    monthlyFee: number = 0,
    initialFees: AssignedFee[] = [],
    transaction?: Transaction,
    classId?: string
  ): Promise<void> => {
    const docId = `${studentId}_${academicYearId}`;
    const docRef = doc(db, COLLECTION, docId as string);
    
    const summary = studentFeeService.calculateSummary(initialFees);

    const feeData: any = {
      studentId,
      madrassaId,
      parentId,
      academicYearId,
      monthlyFee,
      assignedFees: initialFees,
      totalAmount: summary.totalAmount,
      paidAmount: summary.paidAmount,
      dueAmount: summary.dueAmount,
      status: summary.status,
      ...(classId ? { classId } : {}),
    };

    if (transaction) {
      transaction.set(docRef, feeData);
    } else {
      const batch = writeBatch(db);
      batch.set(docRef, feeData);
      await batch.commit();
    }
  },

  getStudentFees: async (
    studentId: string,
    academicYearId: string
  ): Promise<StudentFee | null> => {
    const docId = `${studentId}_${academicYearId}`;
    const docRef = doc(db, COLLECTION, docId as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as StudentFee;
    }
    return null;
  },

  /**
   * Cost-optimized: Fetch ALL studentFees for a madrassa/year in ONE query.
   * Replaces the N+1 pattern of calling getStudentFees per student.
   * Cost: 1 read (vs N reads previously).
   */
  getAllStudentFees: async (
    madrassaId: string,
    academicYearId: string
  ): Promise<StudentFee[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StudentFee);
  },

  /**
   * Internal logic to calculate summary
   */
  calculateSummary: (assignedFees: AssignedFee[]) => {
    let totalAmount = 0;
    let paidAmount = 0;

    assignedFees.forEach(fee => {
      if (fee.status !== "CANCELLED" && fee.status !== "WAIVED") {
        totalAmount += fee.amount;
        paidAmount += fee.paidAmount;
      }
    });

    const dueAmount = totalAmount - paidAmount;
    
    let status: FeeStatus = "PENDING";
    if (dueAmount === 0 && totalAmount > 0) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    } else if (totalAmount === 0 && assignedFees.length > 0) {
      // e.g. all waived
      status = "PAID"; // or WAIVED
    }

    return { totalAmount, paidAmount, dueAmount, status };
  },

  assignFee: async (
    madrassaId: string,
    studentId: string,
    academicYearId: string,
    feeCategory: FeeCategory,
    classId?: string,
    dueDate?: Date
  ): Promise<void> => {
    const docId = `${studentId}_${academicYearId}`;
    const docRef = doc(db, COLLECTION, docId as string);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) {
        throw new Error("Student fee record not found for this academic year.");
      }
      
      const currentData = snap.data() as StudentFee;
      const assignedFees = currentData.assignedFees || [];
      
      // For custom assignment, use timestamp as simple ID
      const assignedFeeId = `FEE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      let baseAmount = feeCategory.amount;
      if (feeCategory.isClassWise && classId && feeCategory.classAmounts?.[classId]) {
        baseAmount = feeCategory.classAmounts[classId];
      }
      
      const newFee: AssignedFee = {
        id: assignedFeeId,
        feeCategoryId: feeCategory.id!,
        feeName: feeCategory.name,
        amount: baseAmount,
        paidAmount: 0,
        dueAmount: baseAmount,
        status: "PENDING",
        assignedAt: Timestamp.now(),
      };

      if (dueDate) {
        newFee.dueDate = Timestamp.fromDate(dueDate);
      }

      assignedFees.push(newFee);

      const summary = studentFeeService.calculateSummary(assignedFees);

      transaction.update(docRef, {
        assignedFees,
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        dueAmount: summary.dueAmount,
        status: summary.status
      });
    });
  },

  assignBulkFee: async (
    madrassaId: string,
    academicYearId: string,
    studentIds: string[],
    feeCategory: FeeCategory,
    classId?: string,
    dueDate?: Date
  ): Promise<void> => {
    // Break into chunks of 100 max
    const CHUNK_SIZE = 100;
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      const chunk = studentIds.slice(i, i + CHUNK_SIZE);
      
      const batch = writeBatch(db);
      
      // Need to fetch current states to calculate due correctly
      const docRefs = chunk.map(id => doc(db, COLLECTION, `${id}_${academicYearId}`));
      
      // Wait, we can't reliably update via batch without knowing current array unless we use arrayUnion. 
      // But arrayUnion cannot update totalAmount/dueAmount automatically. 
      // So we have to fetch them all. Since there are max 100, we can fetch concurrently.
      const snaps = await Promise.all(docRefs.map(ref => getDoc(ref)));
      
      snaps.forEach((snap, idx) => {
        if (snap.exists()) {
          const currentData = snap.data() as StudentFee;
          const assignedFees = currentData.assignedFees || [];
          
          const assignedFeeId = `FEE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          let baseAmount = feeCategory.amount;
          if (feeCategory.isClassWise && classId && feeCategory.classAmounts?.[classId]) {
            baseAmount = feeCategory.classAmounts[classId];
          }

          const newFee: AssignedFee = {
            id: assignedFeeId,
            feeCategoryId: feeCategory.id!,
            feeName: feeCategory.name,
            amount: baseAmount,
            paidAmount: 0,
            dueAmount: baseAmount,
            status: "PENDING",
            assignedAt: Timestamp.now(),
          };
          if (dueDate) {
            newFee.dueDate = Timestamp.fromDate(dueDate);
          }
          
          assignedFees.push(newFee);
          const summary = studentFeeService.calculateSummary(assignedFees);
          
          // @ts-ignore
          batch.update(docRefs[idx], {
            assignedFees,
            totalAmount: summary.totalAmount,
            paidAmount: summary.paidAmount,
            dueAmount: summary.dueAmount,
            status: summary.status
          });
        }
      });
      
      await batch.commit();
    }
  },

  generateMonthlyFees: async (
    madrassaId: string,
    academicYearId: string,
    classId: string | null,
    feeCategory: FeeCategory,
    month: number,
    year: number,
    dueDate?: Date
  ): Promise<number> => {
    // 1. Fetch ACTIVE students in this class (or all classes if classId is null)
    const studentsRef = (collection as any)(db, "students");
    const constraints: any[] = [
      where("madrassaId", "==", madrassaId),
      where("status", "==", "ACTIVE")
    ];
    if (classId) {
      constraints.push(where("classId", "==", classId));
    }
    const q = (query as any)(studentsRef, ...constraints);
    const studentSnaps = await getDocs(q);
    
    if (studentSnaps.empty) return 0;
    
    const studentDocs = studentSnaps.docs;
    let generatedCount = 0;
    
    const CHUNK_SIZE = 100;
    for (let i = 0; i < studentDocs.length; i += CHUNK_SIZE) {
      const chunk = studentDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      const docRefs = chunk.map(d => doc(db, COLLECTION, `${d.id}_${academicYearId}`));
      const snaps = await Promise.all(docRefs.map(ref => getDoc(ref)));
      
      snaps.forEach((snap, idx) => {
        if (snap.exists()) {
          const currentData = snap.data() as StudentFee;
          const assignedFees = currentData.assignedFees || [];
          const studentDoc = chunk[idx]!;
          const studentClassId = (studentDoc.data() as any).classId;
          
          const uniqueKey = `${studentDoc.id}_${month}_${year}_${feeCategory.id}`;
          
          // Check for duplicate
          const exists = assignedFees.some(f => f.uniqueKey === uniqueKey);
          if (!exists) {
            const assignedFeeId = `FEE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            
            // Use the student's monthly fee if they have a custom one set on their record
            // Otherwise check if the category is class-wise and has an amount for this class
            // Finally fallback to the default category amount
            let baseAmount = feeCategory.amount;
            if (feeCategory.isClassWise && feeCategory.classAmounts?.[studentClassId]) {
              baseAmount = feeCategory.classAmounts[studentClassId];
            }
            const amount = currentData.monthlyFee > 0 ? currentData.monthlyFee : baseAmount;
            
            const newFee: AssignedFee = {
              id: assignedFeeId,
              feeCategoryId: feeCategory.id!,
              feeName: `${feeCategory.name} - ${month}/${year}`,
              amount,
              paidAmount: 0,
              dueAmount: amount,
              month,
              year,
              status: "PENDING",
              assignedAt: Timestamp.now(),
              uniqueKey
            };
            
            if (dueDate) {
              newFee.dueDate = Timestamp.fromDate(dueDate);
            }
            
            assignedFees.push(newFee);
            const summary = studentFeeService.calculateSummary(assignedFees);
            
            // @ts-ignore
            batch.update(docRefs[idx], {
              assignedFees,
              totalAmount: summary.totalAmount,
              paidAmount: summary.paidAmount,
              dueAmount: summary.dueAmount,
              status: summary.status
            });
            generatedCount++;
          }
        }
      });
      
      await batch.commit();
    }
    
    return generatedCount;
  }
};

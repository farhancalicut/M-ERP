import { db } from "@/lib/firebase/firestore";
import { collection, doc, getDoc, getDocs, query, where, runTransaction, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";
import { FeeCategory, StudentFee, AssignedFee, Madrassa } from "@/types/schema";
import { studentFeeService } from "./studentFeeService";

export const feeGeneratorService = {
  /**
   * Generates recurring fees for the current month.
   * Uses a transaction on the Madrassa document to ensure concurrency safety.
   */
  lazyGenerateFees: async (madrassaId: string, academicYearId: string): Promise<void> => {
    const madrassaRef = doc(db, "madrassas", madrassaId);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // 1. Concurrency-safe lock and check
    const shouldGenerate = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(madrassaRef);
      if (!snap.exists()) return false;
      const data = snap.data() as Madrassa;
      
      if (data.lastFeeGenerationDate === monthKey) {
        // Already generated for this month
        return false;
      }
      
      // We are the first to trigger for this month. Claim it.
      transaction.update(madrassaRef, {
        lastFeeGenerationDate: monthKey
      });
      return true;
    });

    if (!shouldGenerate) {
      return; // Safe exit
    }

    try {
      // 2. Fetch recurring Fee Categories
      const categoriesQuery = query(
        collection(db, "feeCategories"),
        where("madrassaId", "==", madrassaId),
        where("recurring", "==", true),
        where("status", "==", "ACTIVE")
      );
      const catSnap = await getDocs(categoriesQuery);
      const recurringCategories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeeCategory));

      if (recurringCategories.length === 0) return;

      // 3. Fetch all Student Fees for the active academic year
      const feesQuery = query(
        collection(db, "studentFees"),
        where("madrassaId", "==", madrassaId),
        where("academicYearId", "==", academicYearId)
      );
      const feesSnap = await getDocs(feesQuery);
      
      // 4. Chunk and update in batches (Max 500 writes per batch)
      const MAX_BATCH_SIZE = 450;
      let batch = writeBatch(db);
      let opCount = 0;
      const batches = [batch];

      for (const feeDoc of feesSnap.docs) {
        const studentFee = { id: feeDoc.id, ...feeDoc.data() } as StudentFee & { id: string };
        let modified = false;
        const newAssignedFees = [...(studentFee.assignedFees || [])];

        for (const cat of recurringCategories) {
          const uniqueKey = `${cat.id}_${monthKey}`;
          
          // Check if already assigned
          const exists = newAssignedFees.some(f => f.uniqueKey === uniqueKey);
          if (!exists) {
            // Determine amount (check class-wise or default)
            let feeAmount = cat.amount;
            // (Assumes we might need classId, but studentFees doesn't explicitly store classId here. 
            // In a robust system, we either store classId on StudentFee or fetch it.
            // If class amounts exist, we need to know the student's class. 
            // Since studentFee doesn't have classId, we fallback to default amount or monthlyFee override)
            if (studentFee.monthlyFee > 0 && cat.feeType === 'MONTHLY_TUITION') {
              feeAmount = studentFee.monthlyFee;
            } else if (cat.isClassWise && studentFee.classId && cat.classAmounts?.[studentFee.classId]) {
              // Use class-specific amount stored on studentFee — no extra read needed
              feeAmount = cat.classAmounts[studentFee.classId] || 0;
            }

            const newAssigned: AssignedFee = {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              feeCategoryId: cat.id as string,
              feeName: `${cat.name} (${monthKey})`,
              amount: feeAmount,
              paidAmount: 0,
              dueAmount: feeAmount,
              month: currentMonth,
              year: currentYear,
              status: "PENDING",
              assignedAt: Timestamp.now(),
              uniqueKey
            };
            newAssignedFees.push(newAssigned);
            modified = true;
          }
        }

        if (modified) {
          const summary = studentFeeService.calculateSummary(newAssignedFees);
          const ref = doc(db, "studentFees", studentFee.id);
          batch.update(ref, {
            assignedFees: newAssignedFees,
            totalAmount: summary.totalAmount,
            paidAmount: summary.paidAmount,
            dueAmount: summary.dueAmount,
            status: summary.status,
            updatedAt: serverTimestamp()
          });
          opCount++;

          if (opCount >= MAX_BATCH_SIZE) {
            batch = writeBatch(db);
            batches.push(batch);
            opCount = 0;
          }
        }
      }

      for (const b of batches) {
        await b.commit();
      }
    } catch (error) {
      console.error("Fee generation failed, resetting lock.", error);
      // Rollback lock if failure occurs
      await runTransaction(db, async (t) => {
        t.update(madrassaRef, { lastFeeGenerationDate: null });
      });
      throw error;
    }
  }
};

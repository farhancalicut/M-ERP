import { db } from "@/lib/firebase/firestore";
import { doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { StudentFee } from "@/types/schema";
import { studentFeeService } from "./studentFeeService";

export const waiverService = {
  /**
   * Waive an assigned fee (fully or partially).
   * Cost: 1 read + 1 write (single transaction).
   */
  waiveFee: async (
    studentId: string,
    academicYearId: string,
    assignedFeeId: string,
    waivedByUid: string,
    reason: string,
    waivedAmount?: number
  ): Promise<void> => {
    const docId = `${studentId}_${academicYearId}`;
    const docRef = doc(db, "studentFees", docId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error("Student fee record not found.");

      const studentFee = snap.data() as StudentFee;
      const assignedFees = [...(studentFee.assignedFees || [])];
      const idx = assignedFees.findIndex(f => f.id === assignedFeeId);
      if (idx === -1) throw new Error("Assigned fee not found.");

      const fee = { ...assignedFees[idx]! };
      if (fee.status === "PAID") throw new Error("Cannot waive a fully paid fee.");
      if (fee.status === "WAIVED") throw new Error("Fee is already waived.");
      if (fee.status === "CANCELLED") throw new Error("Cannot waive a cancelled fee.");

      const amountToWaive = waivedAmount ?? fee.dueAmount;
      if (amountToWaive <= 0 || amountToWaive > fee.dueAmount) {
        throw new Error("Invalid waiver amount.");
      }

      (fee as any).waivedAmount = ((fee as any).waivedAmount ?? 0) + amountToWaive;
      (fee as any).waivedBy = waivedByUid;
      (fee as any).waivedAt = Timestamp.now();
      (fee as any).waivedReason = reason;
      fee.dueAmount -= amountToWaive;
      fee.status = fee.dueAmount === 0 ? "WAIVED" : "PARTIAL";

      assignedFees[idx] = fee;
      const summary = studentFeeService.calculateSummary(assignedFees);

      transaction.update(docRef, {
        assignedFees,
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        dueAmount: summary.dueAmount,
        status: summary.status,
        updatedAt: serverTimestamp(),
      });
    });
  },
};
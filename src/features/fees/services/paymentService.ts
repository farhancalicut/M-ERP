import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  serverTimestamp,
  QueryDocumentSnapshot,
  Timestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { FeePayment, StudentFee } from "@/types/schema";
import { PaymentMethod } from "@/types/enums";
import { studentFeeService } from "./studentFeeService";
import { notificationService } from "@/features/notifications/services/notificationService";

const COLLECTION = "feePayments";

export const paymentService = {
  collectPayment: async (
    madrassaId: string,
    studentId: string,
    parentId: string,
    academicYearId: string,
    feeCategoryId: string,
    assignedFeeId: string, // ID of the specific AssignedFee to pay against
    amount: number,
    paymentMethod: PaymentMethod,
    collectedByUid: string,
    collectorRole: string, // 'TEACHER', 'PRINCIPAL', 'MANAGEMENT', etc.
    remarks?: string,
    paymentDate?: Date
  ): Promise<FeePayment> => {
    
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const docId = `${studentId}_${academicYearId}`;
    const studentFeeRef = doc(db, "studentFees", docId as string);
    const counterRef = doc(db, "counters", `${madrassaId}_payments`);
    const paymentRef = doc(collection(db, COLLECTION));

    let createdPayment: FeePayment | undefined;
    const isTeacher = collectorRole === 'TEACHER';

    await runTransaction(db, async (transaction) => {
      const studentFeeSnap = await transaction.get(studentFeeRef);
      if (!studentFeeSnap.exists()) {
        throw new Error("Student fee record not found.");
      }

      const studentFee = studentFeeSnap.data() as StudentFee;
      const assignedFees = studentFee.assignedFees || [];
      
      let targetFee: any = null;
      let targetFeeIndex = -1;

      if (assignedFeeId !== "DONATION") {
        targetFeeIndex = assignedFees.findIndex(f => f.id === assignedFeeId);
        if (targetFeeIndex === -1) {
          throw new Error("Assigned fee not found.");
        }
        targetFee = assignedFees[targetFeeIndex];
        
        if (targetFee.status === 'PAID' || targetFee.status === 'WAIVED' || targetFee.status === 'CANCELLED') {
          throw new Error(`Cannot collect payment for fee in ${targetFee.status} status.`);
        }
        
        if (amount > targetFee.dueAmount) {
          throw new Error("Payment amount cannot exceed due amount.");
        }
        // Partial payments are allowed — status will be PARTIAL until fully paid
      }

      // Generate payment number
      const receiptPrefix = "RCT";
      const counterSnap = await transaction.get(counterRef);
      let currentCounter = 0;
      if (counterSnap.exists()) {
        currentCounter = counterSnap.data().count || 0;
      }
      const newCounter = currentCounter + 1;
      const paymentNo = `${receiptPrefix}-${String(newCounter).padStart(6, '0')}`;
      
      const pDate = paymentDate ? Timestamp.fromDate(paymentDate) : (serverTimestamp() as unknown as Timestamp);
      
      // Create payment document
      // @ts-ignore
      createdPayment = {
        id: paymentRef.id,
        paymentNo,
        receiptNo: paymentNo,
        madrassaId,
        studentId,
        parentId,
        academicYearId,
        feeCategoryId,
        assignedFeeId,
        amount,
        paymentDate: pDate,
        paymentMethod,
        remarks: remarks || "",
        collectedBy: collectedByUid,
        status: "ACTIVE",
        transactionType: "FEE",
        createdAt: serverTimestamp() as unknown as Timestamp,
      };

      transaction.set(counterRef, { count: newCounter });
      transaction.set(paymentRef, createdPayment);

      // Instantly verify and update ledger for everyone
      if (assignedFeeId !== "DONATION" && targetFee) {
        targetFee.paidAmount += amount;
        targetFee.dueAmount -= amount;
        targetFee.status = targetFee.dueAmount === 0 ? 'PAID' : 'PARTIAL';
        assignedFees[targetFeeIndex] = targetFee;
      }
      
      const summary = studentFeeService.calculateSummary(assignedFees);
      
      transaction.update(studentFeeRef, {
        assignedFees,
        totalAmount: assignedFeeId === "DONATION" ? summary.totalAmount + amount : summary.totalAmount,
        paidAmount: assignedFeeId === "DONATION" ? summary.paidAmount + amount : summary.paidAmount,
        dueAmount: summary.dueAmount,
        status: summary.status,
      });
    });

    if (!createdPayment) {
      throw new Error("Payment collection failed.");
    }

    // Fire notification to parent (non-blocking, best-effort)
    if (parentId && assignedFeeId !== "DONATION") {
      notificationService.createNotificationSafe({
        madrassaId,
        type: "FEES",
        title: "Fee Payment Received",
        message: `A payment of ₹${amount.toLocaleString()} has been recorded. Receipt No: ${createdPayment.receiptNo}.`,
        receiverType: "USER",
        receiverIds: [parentId],
        priority: "MEDIUM",
        status: "ACTIVE",
        readBy: [],
      } as any);
    }

    return createdPayment;
  },

  deletePayment: async (
    paymentId: string
  ): Promise<void> => {
    const paymentRef = doc(db, COLLECTION, paymentId as string);
    
    await runTransaction(db, async (transaction) => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists()) {
        throw new Error("Payment record not found.");
      }
      
      const payment = paymentSnap.data() as FeePayment;
      if (payment.status === "VOID") {
        throw new Error("Payment is already voided.");
      }

      // Expense/Donation mirrors: just mark as VOID, no ledger rollback needed
      const isNonStudentTransaction = 
        (payment as any).transactionType === "EXPENSE" ||
        (payment as any).transactionType === "DONATION" ||
        payment.studentId === "N/A";

      if (isNonStudentTransaction) {
        transaction.update(paymentRef, { status: "VOID" });
        return;
      }
      
      const docId = `${payment.studentId}_${payment.academicYearId}`;
      const studentFeeRef = doc(db, "studentFees", docId as string);
      const studentFeeSnap = await transaction.get(studentFeeRef);

      if (!studentFeeSnap.exists()) {
        throw new Error("Student fee record not found for rollback.");
      }
      
      const studentFee = studentFeeSnap.data() as StudentFee;
      const assignedFees = studentFee.assignedFees || [];
      
      // We use assignedFeeId if available to exactly match the fee.
      let targetFeeIndex = -1;
      
      if (payment.assignedFeeId) {
        targetFeeIndex = assignedFees.findIndex(f => f.id === payment.assignedFeeId);
      } else {
        // Fallback for any older payments without assignedFeeId
        const possibleFees = assignedFees
          .filter(f => f.feeCategoryId === payment.feeCategoryId && f.paidAmount >= payment.amount)
          .sort((a, b) => b.assignedAt.toMillis() - a.assignedAt.toMillis());
          
        if (possibleFees.length > 0) {
          // @ts-ignore
          targetFeeIndex = assignedFees.findIndex(f => f.id === possibleFees[0].id);
        }
      }
        
      if (targetFeeIndex === -1) {
        throw new Error("Could not find matching assigned fee to rollback.");
      }
      
      // Rollback
      // @ts-ignore
      assignedFees[targetFeeIndex].paidAmount -= payment.amount;
      // @ts-ignore
      assignedFees[targetFeeIndex].dueAmount += payment.amount;
      
      // @ts-ignore
      if (assignedFees[targetFeeIndex].paidAmount === 0) {
        // @ts-ignore
        assignedFees[targetFeeIndex].status = 'PENDING';
      } else {
        // @ts-ignore
        assignedFees[targetFeeIndex].status = 'PARTIAL';
      }
      
      const summary = studentFeeService.calculateSummary(assignedFees);
      
      transaction.update(paymentRef, {
        status: "VOID",
        remarks: payment.remarks ? `${payment.remarks} (VOIDED)` : "VOIDED",
      });
      
      transaction.update(studentFeeRef, {
        assignedFees,
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        dueAmount: summary.dueAmount,
        status: summary.status,
      });
    });
  },

  updatePayment: async (
    paymentId: string,
    updatedByUid: string,
    updates: {
      amount?: number;
      paymentMethod?: PaymentMethod;
      remarks?: string;
    }
  ): Promise<void> => {
    // A robust way to handle update is to void and recreate if amount changes, 
    // but the requirement says "Allow update only when paymentDate is today. Otherwise: Void old payment, Create new payment."
    // In our UI we can just enforce Void + Create new. But since we need an updatePayment method, 
    // if amount is changed we must run a transaction to fix balances.
    // Given the complexity of adjusting balances correctly (preventing overpayment), 
    // the safest programmatic approach is to void the existing payment and create a new one transparently.
    
    // For simplicity in this implementation, we will fetch the payment, void it, then collect a new one.
    const paymentRef = doc(db, COLLECTION, paymentId as string);
    const paymentSnap = await getDoc(paymentRef);
    if (!paymentSnap.exists()) throw new Error("Payment not found");
    const payment = paymentSnap.data() as FeePayment;
    
    if (payment.status === 'VOID') throw new Error("Cannot update a voided payment.");
    
    // 1. Delete (void) old payment
    await paymentService.deletePayment(paymentId);
    
    // 2. Create new payment
    if (!payment.assignedFeeId) {
      throw new Error("Cannot safely update payment missing assignedFeeId.");
    }

    await paymentService.collectPayment(
      payment.madrassaId,
      payment.studentId,
      payment.parentId,
      payment.academicYearId,
      payment.feeCategoryId,
      payment.assignedFeeId,
      updates.amount ?? payment.amount,
      updates.paymentMethod ?? payment.paymentMethod,
      updatedByUid,
      "MANAGEMENT", // updater role for immediate verification
      updates.remarks ?? payment.remarks,
      payment.paymentDate.toDate()
    );
  },

  getStudentPayments: async (
    madrassaId: string,
    studentId: string,
    academicYearId: string
  ): Promise<FeePayment[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("studentId", "==", studentId),
      where("academicYearId", "==", academicYearId)
    );
    const snap = await getDocs(q);
    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }) as FeePayment);
    return payments.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  },

  getPayments: async (
    madrassaId: string,
    filters?: {
      studentId?: string;
      classId?: string;
      paymentMethod?: PaymentMethod;
      dateRange?: { start: Date, end: Date };
    },
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot | null
  ): Promise<{ payments: FeePayment[]; lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [where("madrassaId", "==", madrassaId)];

    if (filters?.studentId) {
      constraints.push(where("studentId", "==", filters.studentId));
    }
    if (filters?.paymentMethod) {
      constraints.push(where("paymentMethod", "==", filters.paymentMethod));
    }
    if (filters?.dateRange) {
      constraints.push(where("paymentDate", ">=", Timestamp.fromDate(filters.dateRange.start)));
      constraints.push(where("paymentDate", "<=", Timestamp.fromDate(filters.dateRange.end)));
    }

    // Always sort by paymentDate so cursor-based pagination works correctly for all query types
    constraints.push(orderBy("paymentDate", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FeePayment);

    return {
      payments,
      lastDoc: snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] || null) : null
    };
  },

  verifyPayment: async (
    paymentId: string,
    action: "APPROVE" | "REJECT",
    verifierUid: string,
    rejectionReason?: string
  ): Promise<void> => {
    const paymentRef = doc(db, COLLECTION, paymentId);
    
    await runTransaction(db, async (transaction) => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists()) throw new Error("Payment not found");
      const payment = paymentSnap.data() as FeePayment;

      if (payment.status !== "PENDING") {
        throw new Error(`Cannot verify payment with status: ${payment.status}`);
      }

      if (action === "REJECT") {
        transaction.update(paymentRef, {
          status: "REJECTED",
          verifiedBy: verifierUid,
          verifiedAt: serverTimestamp(),
          rejectionReason: rejectionReason || "Rejected by management"
        });
        return;
      }

      // Action is APPROVE -> Update ledger
      const docId = `${payment.studentId}_${payment.academicYearId}`;
      const studentFeeRef = doc(db, "studentFees", docId);
      const studentFeeSnap = await transaction.get(studentFeeRef);
      
      if (!studentFeeSnap.exists()) throw new Error("Student fee record not found.");
      
      const studentFee = studentFeeSnap.data() as StudentFee;
      const assignedFees = studentFee.assignedFees || [];
      const targetFeeIndex = assignedFees.findIndex(f => f.id === payment.assignedFeeId);
      
      if (targetFeeIndex === -1) throw new Error("Assigned fee not found.");
      
      const targetFee = assignedFees[targetFeeIndex];
      
      // Update assigned fee balances
      // @ts-ignore
      targetFee.paidAmount += payment.amount;
      // @ts-ignore
      targetFee.dueAmount -= payment.amount;
      // @ts-ignore
      targetFee.status = targetFee.dueAmount === 0 ? 'PAID' : 'PARTIAL';
      
      // @ts-ignore
      assignedFees[targetFeeIndex] = targetFee;
      
      const summary = studentFeeService.calculateSummary(assignedFees);
      
      transaction.update(studentFeeRef, {
        assignedFees,
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        dueAmount: summary.dueAmount,
        status: summary.status,
      });

      transaction.update(paymentRef, {
        status: "ACTIVE",
        receiptNo: payment.paymentNo,
        verifiedBy: verifierUid,
        verifiedAt: serverTimestamp()
      });
    });
  },

  getPendingPayments: async (madrassaId: string): Promise<FeePayment[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("status", "==", "PENDING"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as FeePayment);
  },

  getPaymentStats: async (madrassaId: string): Promise<{
    todayCollection: number;
    monthCollection: number;
    pendingCount: number;
  }> => {
    // 1. Pending count
    const pendingQ = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("status", "==", "PENDING")
    );
    const pendingSnap = await getDocs(pendingQ);
    const pendingCount = pendingSnap.size;

    // 2. Collections (today & month)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const activeQ = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("status", "==", "ACTIVE"),
      where("paymentDate", ">=", Timestamp.fromDate(startOfMonth))
    );
    const activeSnap = await getDocs(activeQ);
    
    let todayCollection = 0;
    let monthCollection = 0;
    
    activeSnap.docs.forEach(docSnap => {
      const p = docSnap.data() as FeePayment;
      // Exclude expense/donation mirrors from fee collection stats
      const txType = (p as any).transactionType;
      if (txType === 'EXPENSE' || txType === 'DONATION') return;
      monthCollection += p.amount;
      if (p.paymentDate.toDate() >= today) {
        todayCollection += p.amount;
      }
    });

    return { todayCollection, monthCollection, pendingCount };
  },

  getDashboardAnalytics: async (madrassaId: string, academicYearId: string, classId?: string | "ALL") => {
    // We fetch all student fees for the academic year and class
    const studentFeesRef = collection(db, "studentFees");
    let constraints: QueryConstraint[] = [];
    
    // In our schema, studentFees ID is `${studentId}_${academicYearId}` 
    // Wait, studentFees don't have madrassaId explicitly in the root? Let's check.
    // If they don't, we can fetch all students for the madrassa/class, then fetch their fees.
    
    const studentsRef = collection(db, "students");
    const stdConstraints: QueryConstraint[] = [where("madrassaId", "==", madrassaId)];
    if (classId && classId !== "ALL") {
      stdConstraints.push(where("classId", "==", classId));
    }
    const studentSnaps = await getDocs(query(studentsRef, ...stdConstraints));
    const students = studentSnaps.docs.map(d => ({ id: d.id, ...d.data() }));
    const studentIds = students.map(s => s.id);
    const studentMap = new Map(students.map(s => [s.id, s as any]));

    // Fetch fee records in chunks of 10
    const feeRecords: StudentFee[] = [];
    for (let i = 0; i < studentIds.length; i += 10) {
      const chunk = studentIds.slice(i, i + 10);
      const snaps = await Promise.all(chunk.map(id => getDoc(doc(db, "studentFees", `${id}_${academicYearId}`))));
      snaps.forEach(snap => {
        if (snap.exists()) feeRecords.push(snap.data() as StudentFee);
      });
    }

    // Top Defaulters
    const defaulters = feeRecords
      .filter(f => f.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 5)
      .map(f => ({
        studentName: studentMap.get(f.studentId)?.name || "Unknown",
        className: studentMap.get(f.studentId)?.classId || "Unknown",
        dueAmount: f.dueAmount
      }));

    // Waivers
    let totalWaivers = 0;
    feeRecords.forEach(f => {
      (f.assignedFees || []).forEach(af => {
        if (af.status === "WAIVED") {
          totalWaivers += af.amount;
        }
      });
    });

    // Monthly trends (last 6 months)
    const trendMap = new Map<string, number>();
    const months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
    }).reverse();
    months.forEach(m => trendMap.set(m, 0));

    // Fetch payments for trends
    const paymentsRef = collection(db, "feePayments");
    const pConstraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("status", "==", "ACTIVE")
    ];
    const paymentSnaps = await getDocs(query(paymentsRef, ...pConstraints));
    
    paymentSnaps.docs.forEach(snap => {
      const p = snap.data() as FeePayment;
      // If class filtering is applied, only count if student is in this class
      if (classId && classId !== "ALL" && !studentMap.has(p.studentId)) return;

      const date = p.paymentDate.toDate();
      const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      if (trendMap.has(monthKey)) {
        trendMap.set(monthKey, trendMap.get(monthKey)! + p.amount);
      }
    });

    const collectionTrends = months.map(m => ({ name: m, amount: trendMap.get(m)! }));

    return {
      defaulters,
      totalWaivers,
      collectionTrends
    };
  }
};

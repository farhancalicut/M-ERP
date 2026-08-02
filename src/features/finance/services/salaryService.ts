import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  runTransaction,
  Timestamp,
  orderBy,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { SalaryStructure, SalaryPayment, PaymentMethod } from "@/types/schema";

const STRUCTURES_COL = "salaryStructures";
const PAYMENTS_COL = "salaryPayments";

export const salaryService = {
  getSalaryStructure: async (userId: string): Promise<SalaryStructure | null> => {
    const docRef = doc(db, STRUCTURES_COL, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SalaryStructure;
    }
    return null;
  },

  getAllSalaryStructures: async (madrassaId: string): Promise<SalaryStructure[]> => {
    const q = query(collection(db, STRUCTURES_COL), where("madrassaId", "==", madrassaId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as SalaryStructure);
  },

  updateSalaryStructure: async (
    madrassaId: string,
    userId: string,
    data: Omit<SalaryStructure, "id" | "madrassaId" | "userId" | "createdAt" | "updatedAt">
  ): Promise<void> => {
    const docRef = doc(db, STRUCTURES_COL, userId);
    await setDoc(docRef, {
      ...data,
      madrassaId,
      userId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  },

  getSalaryPayments: async (
    madrassaId: string,
    filters?: { month?: number; year?: number; userId?: string }
  ): Promise<SalaryPayment[]> => {
    const constraints: any[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (filters?.month) constraints.push(where("month", "==", filters.month));
    if (filters?.year) constraints.push(where("year", "==", filters.year));
    if (filters?.userId) constraints.push(where("userId", "==", filters.userId));

    // Note: We can't orderBy paymentDate easily with multiple equality filters unless we create a composite index.
    // For now, we will sort on the client or let Firestore do it if index exists.
    const q = query(collection(db, PAYMENTS_COL), ...constraints);
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as SalaryPayment)).sort((a, b) => {
      const aDate = (a.paymentDate as any)?.toMillis() || 0;
      const bDate = (b.paymentDate as any)?.toMillis() || 0;
      return bDate - aDate;
    });
  },

  processSalaryPayment: async (
    madrassaId: string,
    userId: string,
    month: number,
    year: number,
    data: {
      baseSalary: number;
      allowances: { name: string; amount: number }[];
      deductions: { name: string; amount: number }[];
      netPaid: number;
      paymentMethod: PaymentMethod;
      remarks?: string;
    }
  ): Promise<SalaryPayment> => {
    // Generate a unique ID based on user + month + year to prevent duplicate payments
    const paymentId = `${userId}_${month}_${year}`;
    const paymentRef = doc(db, PAYMENTS_COL, paymentId);

    let createdPayment: SalaryPayment | undefined;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(paymentRef);
      if (snap.exists()) {
        const existing = snap.data() as SalaryPayment;
        if (existing.status === "PAID") {
          throw new Error(`Salary for ${month}/${year} has already been processed.`);
        }
      }

      const newPayment: SalaryPayment = {
        madrassaId,
        userId,
        month,
        year,
        paymentDate: serverTimestamp() as any,
        baseSalary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        netPaid: data.netPaid,
        paymentMethod: data.paymentMethod,
        remarks: data.remarks,
        status: "PAID",
        createdAt: serverTimestamp() as any,
      };

      transaction.set(paymentRef, newPayment);
      createdPayment = { ...newPayment, id: paymentId };
    });

    if (!createdPayment) {
      throw new Error("Failed to process salary payment");
    }

    return createdPayment;
  },

  voidSalaryPayment: async (paymentId: string): Promise<void> => {
    const paymentRef = doc(db, PAYMENTS_COL, paymentId);
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(paymentRef);
      if (!snap.exists()) {
        throw new Error("Payment record not found");
      }
      
      const payment = snap.data() as SalaryPayment;
      if (payment.status === "VOID") {
        throw new Error("Payment is already voided");
      }

      transaction.update(paymentRef, {
        status: "VOID",
        updatedAt: serverTimestamp()
      });
    });
  }
};

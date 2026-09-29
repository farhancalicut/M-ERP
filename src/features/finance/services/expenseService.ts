import { db } from "@/lib/firebase/firestore";
import { collection, doc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { Expense } from "@/types/schema";

const COLLECTION = "expenses";

export const expenseService = {
  createExpense: async (
    madrassaId: string,
    amount: number,
    description: string,
    recordedByUid: string,
    expenseDate?: Date
  ): Promise<Expense> => {
    const batch = writeBatch(db);

    const expenseRef = doc(collection(db, COLLECTION));
    const eDate = expenseDate ? Timestamp.fromDate(expenseDate) : Timestamp.now();

    const expense: Expense = {
      id: expenseRef.id,
      madrassaId,
      amount,
      description,
      recordedBy: recordedByUid,
      date: eDate,
      createdAt: serverTimestamp() as unknown as Timestamp,
      status: "ACTIVE"
    };
    batch.set(expenseRef, expense);

    // Mirror to feePayments for unified Payment History
    const paymentRef = doc(collection(db, "feePayments"));
    batch.set(paymentRef, {
      id: paymentRef.id,
      madrassaId,
      paymentNo: `EXP-${expenseRef.id.slice(-6).toUpperCase()}`,
      receiptNo: `EXP-${expenseRef.id.slice(-6).toUpperCase()}`,
      amount,
      paymentDate: eDate,
      paymentMethod: "CASH",
      remarks: description,
      collectedBy: recordedByUid,
      status: "ACTIVE",
      transactionType: "EXPENSE",
      sourceId: expenseRef.id,
      studentId: "N/A",
      parentId: "N/A",
      academicYearId: "N/A",
      feeCategoryId: "EXPENSE",
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return expense;
  },

  getExpensesByMadrassa: async (madrassaId: string): Promise<Expense[]> => {
    const q = query(collection(db, COLLECTION), where("madrassaId", "==", madrassaId));
    const snap = await getDocs(q);
    const expenses = snap.docs.map(d => d.data() as Expense);
    return expenses.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });
  },

  updateExpense: async (
    expenseId: string,
    updates: Partial<Omit<Expense, "id" | "madrassaId" | "createdAt" | "recordedBy">>
  ): Promise<void> => {
    const ref = doc(db, COLLECTION, expenseId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    const ref = doc(db, COLLECTION, expenseId);
    await deleteDoc(ref);
  }
};
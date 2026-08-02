import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

export const counterService = {
  /**
   * Generates a sequential ID using a Firestore transaction.
   * Format: {PREFIX}{YEAR}{4-digit-sequence}
   * Example: STU20260001
   */
  generateNextId: async (madrassaId: string, prefix: string): Promise<string> => {
    const year = new Date().getFullYear();
    const counterId = `${madrassaId}_${prefix}_${year}`;
    const counterRef = doc(db, 'counters', counterId);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextSeq = 1;
      if (counterDoc.exists()) {
        nextSeq = (counterDoc.data().seq || 0) + 1;
        transaction.update(counterRef, { seq: nextSeq, madrassaId });
      } else {
        transaction.set(counterRef, { seq: nextSeq, madrassaId });
      }

      // Format sequence to 4 digits: e.g., 0001
      const paddedSeq = nextSeq.toString().padStart(4, '0');
      
      return `${prefix}${year}${paddedSeq}`;
    });
  }
};

import { getDocs, Query, limit as firestoreLimit, query } from "firebase/firestore";

export const reportHelper = {
  /**
   * Executes a query securely while enforcing a limit.
   * Avoids getCountFromServer because it fails with Firebase Rules that use external doc reads (like userDoc).
   */
  async executeQueryWithLimit<T>(q: Query, limitCount = 500): Promise<T[]> {
    const qWithLimit = query(q, firestoreLimit(limitCount + 1));
    const docsSnapshot = await getDocs(qWithLimit);

    if (docsSnapshot.size > limitCount) {
      throw new Error(`Report too large. Please apply more filters (Max: ${limitCount} records).`);
    }

    return docsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }
};

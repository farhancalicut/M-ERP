import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, startAfter, serverTimestamp, DocumentData, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { AuditLog, AuditLogAction, AuditLogModule } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export const auditLogService = {
  /**
   * Fire-and-forget log creation.
   * Does not throw if it fails to avoid breaking critical business flows.
   */
  async createLog(logParams: Omit<AuditLog, "id" | "createdAt">): Promise<void> {
    try {
      const id = uuidv4();
      const docRef = doc(db, "auditLogs", id);
      await setDoc(docRef, {
        ...logParams,
        id,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to create audit log:", err);
    }
  },

  /**
   * Generic paginated fetch
   */
  async getLogs(madrassaId: string, pageSize: number = 20, lastDoc?: DocumentData, filters?: { user?: string, module?: string, action?: string }): Promise<{ logs: AuditLog[], lastDoc: DocumentData | null }> {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (filters?.user) constraints.push(where("userName", "==", filters.user)); // Simplification: search by exact userName
    if (filters?.module) constraints.push(where("module", "==", filters.module));
    if (filters?.action) constraints.push(where("action", "==", filters.action));

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, "auditLogs"), ...constraints);
    const snap = await getDocs(q);

    const logs = snap.docs.map(d => d.data() as AuditLog);
    const newLastDoc = (snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null) as DocumentData | null;

    return { logs, lastDoc: newLastDoc };
  },

  async getModuleLogs(madrassaId: string, moduleName: AuditLogModule, pageSize: number = 20, lastDoc?: DocumentData) {
    return this.getLogs(madrassaId, pageSize, lastDoc, { module: moduleName });
  },

  async getUserLogs(madrassaId: string, userName: string, pageSize: number = 20, lastDoc?: DocumentData) {
    return this.getLogs(madrassaId, pageSize, lastDoc, { user: userName });
  }
};

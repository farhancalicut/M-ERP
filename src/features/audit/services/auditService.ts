/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuditLog } from "../types";

export const auditService = {
  logAction: async (_log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> => {
    // Infrastructure ready - no Firestore calls yet
  },
  getRecentLogs: async (_madrassaId: string, _limit: number = 10): Promise<AuditLog[]> => {
    return []; // Placeholder
  }
};

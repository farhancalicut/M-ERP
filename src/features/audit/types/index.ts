import { Timestamp } from "firebase/firestore";

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';

export interface AuditLog {
  id: string;
  madrassaId: string;
  userId: string;
  userRole: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

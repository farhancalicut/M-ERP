import { Timestamp } from "firebase/firestore";
import { Status } from "./enums";

export interface BaseEntity {
  id: string; // The Firestore Auto ID
  madrassaId: string;
  status: Status;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  academicYear?: string;
  deletedAt?: Timestamp;
  deletedBy?: string;
}

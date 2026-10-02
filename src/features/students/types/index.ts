import { Timestamp } from "firebase/firestore";
import { Gender, Relationship, StudentStatus, ParentStatus } from "@/types/enums";

export interface Parent {
  parentId: string;
  userId: string;
  madrassaId: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  mobileKey: string; // madrassaId_mobile
  email?: string;
  address: string;
  studentIds: string[];
  studentCount: number;
  status: ParentStatus;
  lastActiveStudentId?: string;
  deletedAt?: Timestamp | null;
  deletedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  studentId: string;
  admissionNo: string;
  madrassaId: string;
  parentId: string;
  classId: string;
  name: string;
  nameSearch: string; // Lowercase name
  gender: Gender;
  dob: Timestamp;
  admissionDate: Timestamp;
  photoUrl?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  identityMark?: string;
  majorAchievements?: string;
  address: string;
  guardianRelation: Relationship;
  status: StudentStatus;
  isAlumniEligible: boolean;
  className?: string;
  deletedAt?: Timestamp | null;
  deletedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const fs = require('fs');

const topPart = `import { Timestamp } from "firebase/firestore";
import { Role, Status, FeeType, FeeStatus, PaymentMethod, PaymentStatus, ReceiverType, Gender, Relationship, 
AcademicYearStatus, AssignmentStatus, ExamStatus, MarksStatus, ResultStatus, PromotionAction, PromotionStatus, 
HomeworkStatus, AcademicAssignmentStatus, StudyMaterialStatus, SubmissionStatus, NoticeStatus, NotificationStatus, 
NotificationType, NotificationPriority, NotificationIcon } from "./enums";

export interface BaseEntity {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
  status?: Status;
}

// 1. madrassas
export interface Madrassa extends BaseEntity {
  name: string;
  code: string;
  address: string;
  contactNumber: string;
  email: string;
  subscriptionPlan: string;
}

// 2. users
export interface User extends BaseEntity {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  madrassaId: string;
  isActive: boolean;
}

// 3. academicYears
export interface AcademicYear extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  name: string; // e.g., "2024-2025"
  startDate: Timestamp;
  endDate: Timestamp;
  status: AcademicYearStatus;
  isCurrent: boolean;
}

// 4. terms
export interface Term extends BaseEntity {
  madrassaId: string;
  academicYearId: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
}

// 5. classes
export interface Class extends BaseEntity {
  madrassaId: string;
  name: string;
  displayOrder: number;
  capacity: number;
  isAlumni?: boolean;
}

// 6. subjects
export interface Subject extends BaseEntity {
  madrassaId: string;
  name: string;
  code: string;
  displayOrder: number;
  classIds: string[]; // Classes where this subject is taught
}

// 7. staff
export interface Staff extends BaseEntity {
  madrassaId: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  joiningDate: Timestamp;
}

export interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

// 8. teachers
export interface Teacher extends BaseEntity {
  madrassaId: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  joiningDate: Timestamp;
  qualification: string;
  specialization?: string;
  mobile: string;
  email?: string;
  address: string;
}

// 9. parents
export interface Parent extends BaseEntity {
  parentId: string; // Display ID e.g., PAR0001
  userId: string; // Maps to users/{uid}
  fatherName: string;
  motherName: string;
  mobile: string; // Unique with madrassaId
  email?: string;
  occupation?: string;
  address: string;
}
`;

const middlePartContent = fs.readFileSync('scripts/fix_schema.js', 'utf8');
const middlePartArray = middlePartContent.split('`');
const middlePart = middlePartArray[1] ? middlePartArray[1] : middlePartContent;

// Remove the top part of middlePart if it has overlapping parent fields
const middleClean = middlePart.substring(middlePart.indexOf('// 10. students'));

const phase14Part = `
// 19. phase 14
export interface Homework extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  attachments?: Attachment[];
  dueDate: Timestamp;
  status: HomeworkStatus;
}

export interface AcademicAssignment extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  attachments?: Attachment[];
  dueDate: Timestamp;
  totalMarks: number;
  status: AcademicAssignmentStatus;
}

export interface StudyMaterial extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  attachments: Attachment[];
  status: StudyMaterialStatus;
}

export interface HomeworkSubmission extends BaseEntity {
  homeworkId: string;
  studentId: string;
  madrassaId: string;
  academicYearId: string;
  submittedAt: Timestamp;
  attachments?: Attachment[];
  status: SubmissionStatus;
  teacherRemarks?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}

export interface AssignmentSubmission extends BaseEntity {
  assignmentId: string;
  studentId: string;
  madrassaId: string;
  academicYearId: string;
  submittedAt: Timestamp;
  attachments?: Attachment[];
  status: SubmissionStatus;
  marksObtained?: number;
  teacherRemarks?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}
`;

const phase15Part = `
// 21. notifications & notices
export interface Notice {
  id: string;
  madrassaId: string;
  createdAt: any;
  updatedAt: any;
  title: string;
  description: string;
  attachments?: Attachment[];
  targetRoles: Role[];
  targetClasses: string[];
  targetStudentIds: string[];
  publishedAt?: Timestamp;
  publishedBy?: string;
  expiryDate: Timestamp;
  pinned: boolean;
  status: NoticeStatus;
}

export interface Notification {
  id: string;
  madrassaId: string;
  createdAt: any;
  updatedAt: any;
  type: NotificationType;
  title: string;
  message: string;
  receiverType: ReceiverType;
  receiverIds?: string[];
  senderId?: string;
  actionUrl?: string;
  priority: NotificationPriority;
  icon?: NotificationIcon;
  expiresAt?: Timestamp;
  status: NotificationStatus;
  readBy?: string[];
}
`;

const promotionPart = `
export interface Alumni extends BaseEntity {
  madrassaId: string;
  studentId: string;
  graduatedYearId: string;
}
export interface Promotion extends BaseEntity {
  madrassaId: string;
}
export interface PromotionStudent extends BaseEntity {
  studentId: string;
}
export interface PendingUser extends BaseEntity {
  email: string;
}
`;

fs.writeFileSync('src/types/schema.ts', topPart + middleClean + phase14Part + phase15Part + promotionPart);
console.log('Done rewriting schema');

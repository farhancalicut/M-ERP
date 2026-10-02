import { Timestamp } from "firebase/firestore";
import { Role, Status, FeeType, FeeStatus, PaymentMethod, PaymentStatus, ReceiverType, Gender, Relationship, 
AcademicYearStatus, AssignmentStatus, ExamStatus, MarksStatus, ResultStatus, PromotionAction, PromotionStatus, 
HomeworkStatus, AcademicAssignmentStatus, StudyMaterialStatus, SubmissionStatus, NoticeStatus, NotificationStatus, 
NotificationType, NotificationPriority, NotificationIcon, SubscriptionStatus, AuditLogAction, AuditLogModule, PlatformInvoiceStatus,
LeaveStatus, LeaveType, LeaveRequestType } from "./enums";
import { UserPermissions } from "./permissions";

export type { Role, Status, FeeType, FeeStatus, PaymentMethod, PaymentStatus, ReceiverType, Gender, Relationship, 
AcademicYearStatus, AssignmentStatus, ExamStatus, MarksStatus, ResultStatus, PromotionAction, PromotionStatus, 
HomeworkStatus, AcademicAssignmentStatus, StudyMaterialStatus, SubmissionStatus, NoticeStatus, NotificationStatus, 
NotificationType, NotificationPriority, NotificationIcon, SubscriptionStatus, AuditLogAction, AuditLogModule, PlatformInvoiceStatus, UserPermissions,
LeaveStatus, LeaveType, LeaveRequestType };

export interface BaseEntity {
  id?: string;
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
  board?: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiry?: Timestamp;
  isSetupComplete?: boolean;
  logoUrl?: string;
  lastFeeGenerationDate?: string;
  // Platform analytics counters (denormalized from counters collection for Super Admin)
  studentCount?: number;
  staffCount?: number;
  parentCount?: number;
}

// 2. users
export interface User extends BaseEntity {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string; // Phase 17
  role: Role;
  madrassaId: string;
  isActive: boolean;
  subscriptionStatus?: SubscriptionStatus; // Phase 17
  assignedClassIds?: string[]; // Phase 14
  assignedSubjects?: string[]; // Phase 14
  permissions?: UserPermissions; // RBAC
  userId?: string; // Phase 17: ID used for rules and login (e.g. ALM_STU20260023)
  contactNumber?: string | undefined;
  qualification?: string | undefined;
  specialization?: string | undefined;
  joiningDate?: Timestamp | undefined;
  address?: string | undefined;
  bloodGroup?: string | undefined;
  identityMarks?: string | undefined;
  domainId?: string; // Phase 17: ID of the linked domain document (e.g. PAR0001 or EMP0001)
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

export interface Class extends BaseEntity {
  madrassaId: string;
  globalClassId?: string; // Optional for backward compatibility with legacy custom classes
  division?: string;
  name: string; // Will store full generated name e.g., "Class 1 - A"
  displayOrder: number;
  capacity?: number;
  isAlumni?: boolean;
  currentStrength?: number;
  classTeacherId?: string; // UID of the teacher assigned as class teacher
}

// 6. subjects
export interface Subject extends BaseEntity {
  madrassaId: string;
  name: string;
  code?: string;
  displayOrder: number;
  classIds: string[]; // Classes where this subject is taught
  defaultTotalMarks: number;
  defaultPassMarks: number;
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

export interface TeacherAssignment extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  teacherUid: string;
  classIds: string[];
  subjectIds: string[];
  status: AssignmentStatus;
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

export interface UserSettings extends BaseEntity {
  userId: string;
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    smsAlerts: boolean;
  };
  theme?: "light" | "dark" | "system";
  language?: string;
}

// 18. salaryStructures
export interface SalaryStructure extends BaseEntity {
  madrassaId: string;
  userId: string; // The staff/teacher UID (from users collection)
  baseSalary: number;
  defaultAllowances: { name: string; amount: number }[];
  defaultDeductions: { name: string; amount: number }[];
  netSalary: number;
}

// 19. salaryPayments
export interface SalaryPayment extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  userId: string;
  month: number; // 1-12
  year: number; // e.g. 2024
  paymentDate: Timestamp;
  baseSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  netPaid: number;
  paymentMethod: PaymentMethod;
  remarks?: string | undefined;
  referenceNo?: string | undefined;
  status: "PAID" | "VOID";
}

// 10. students
export interface Student extends Omit<BaseEntity, 'status'> {
  studentId: string;
  name: string;
  gender: Gender;
  dob: Timestamp;
  photo?: string;
  classId: string;
  parentId: string;
  admissionDate: Timestamp;
  bloodGroup?: string;
  medicalNotes?: string;
  identityMark?: string;
  majorAchievements?: string;
  address: string;
}

// 11. studentParents
export interface StudentParent {
  studentId: string;
  parentId: string;
  relationship: Relationship;
  madrassaId: string;
  createdAt: Timestamp;
}

// 12. exams
export interface ExamSubject {
  subjectName: string;
  totalMarks: number;
  passMarks: number;
}

export interface Exam extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  name: string;
  examType: "Quarterly" | "Half-Yearly" | "Final";
  classIds: string[];
  subjects: ExamSubject[]; // Legacy global subjects
  classSubjects?: Record<string, ExamSubject[]>; // New per-class subject snapshot
  includeCE?: boolean;
  maxCEMarks?: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: ExamStatus;
}

// 13. marks
export interface SubjectMark {
  marksObtained: number | null;
  ceMarksObtained?: number | null;
  absent: boolean;
  remarks: string;
  enteredBy?: string;
  submittedBy?: string;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface Mark extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  examId: string;
  classId: string;
  totalStudents: number;
  submitted: boolean;
  submittedAt?: Timestamp;
  locked: boolean;
  lockedAt?: Timestamp;
  lockedBy?: string;
  status: MarksStatus;
  studentIds: string[];
  marks: Record<string, Record<string, SubjectMark>>;
  ceMarks?: Record<string, number>; // Mapping studentId -> CE mark
}

// 14. results
export interface StudentResult {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  failedSubjects: string[];
  resultStatus: ResultStatus;
  isPromoted?: boolean;
}

export interface Result extends BaseEntity {
  madrassaId: string;
  academicYearId: string;
  examId: string;
  classId: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  published: boolean;
  publishedAt?: Timestamp;
  generatedAt: Timestamp;
  students: Record<string, StudentResult>;
}

export interface DailyAttendanceRecord {
  status: "PRESENT" | "ABSENT" | "LEAVE" | "NONE";
  remarks?: string;
  markedBy?: string;
  updatedBy: string;
  updatedAt: Timestamp;
}

export type AttendanceDocStatus = "DRAFT" | "SUBMITTED" | "LOCKED";

// 15. attendance
export interface Attendance extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  academicYearId: string;
  classId: string;
  date: string;
  month: number;
  year: number;
  studentIds: string[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  status: AttendanceDocStatus;
  locked: boolean;
  lastUpdatedRole?: string;
  attendance: Record<string, DailyAttendanceRecord>;
}

// 16. feeCategories
export interface FeeCategory extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  name: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  recurring: boolean;
  isClassWise?: boolean;
  classAmounts?: Record<string, number>;
  status: Status;
}

export interface AssignedFee {
  id: string;
  feeCategoryId: string;
  feeName: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  month?: number;
  year?: number;
  dueDate?: Timestamp;
  status: FeeStatus;
  assignedAt: Timestamp;
  uniqueKey?: string;
}

// 17. studentFees
export interface StudentFee extends Omit<BaseEntity, 'status'> {
  madrassaId: string;       // tenant isolation
  classId?: string;         // for class-wise fee generation
  studentId: string;
  parentId: string;
  academicYearId: string;
  monthlyFee: number;
  assignedFees: AssignedFee[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: FeeStatus;
}

export interface FeePayment extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  paymentNo: string;
  receiptNo?: string;
  studentId: string;
  parentId: string;
  academicYearId: string;
  feeCategoryId: string;
  assignedFeeId?: string;
  amount: number;
  paymentDate: Timestamp;
  paymentMethod: PaymentMethod;
  remarks?: string;
  collectedBy: string;
  status: PaymentStatus;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  rejectionReason?: string;
  transactionType?: 'FEE' | 'EXPENSE' | 'DONATION'; // for unified payment history
  sourceId?: string; // ref to expense/donation doc id
}

export interface Expense extends BaseEntity {
  madrassaId: string;
  amount: number;
  date: Timestamp;
  description: string;
  recordedBy: string; // UID of the user who recorded it (Principal/Manager)
}

export interface Donation extends BaseEntity {
  madrassaId: string;
  amount: number;
  date: Timestamp;
  donorName: string;
  donorContact?: string;
  purpose?: string;
  paymentMethod: 'CASH' | 'BANK' | 'UPI' | 'OTHER';
  recordedBy: string;
  alumniId?: string; // If this donation came from an alumni pledge
}

export interface DonationPledge extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  alumniId: string;
  amount: number;
  paymentMethod: 'BANK' | 'UPI' | 'OTHER';
  transactionId: string;
  purpose?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: Timestamp;
  processedBy?: string; // UID of management who approved/rejected
  processedAt?: Timestamp;
}

export interface DonationSettings {
  madrassaId: string;
  title: string;
  description: string;
  qrCodeUrl?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// 18. gradeConfigs
export interface GradeBoundary {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
}

export interface GradeConfig {
  passPercentage: number;
  grades: GradeBoundary[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

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

export interface HomeworkSubmission extends Omit<BaseEntity, 'status'> {
  homeworkId: string;
  studentId: string;
  madrassaId: string;
  academicYearId: string;
  submittedAt: Timestamp;
  submissionText?: string;
  attachments?: Attachment[];
  status: SubmissionStatus;
  reviewed?: boolean;
  remarks?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}

export interface AssignmentSubmission extends Omit<BaseEntity, 'status'> {
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



// 28. Routines (Daily Routine Module)
export interface RoutineTask {
  id: string; // generated unique id
  category?: string; // e.g., 'Quran', 'Prayer', 'Character', 'Academic', 'Hifz'
  name: string;
}

export interface RoutineTemplate extends BaseEntity {
  madrassaId: string;
  name: string;
  description?: string;
  isActive: boolean;
  tasks: RoutineTask[];
  classIds: string[]; // classes this template applies to
  cutoffTime?: string; // e.g., '23:59' (24-hour format)
}

export type RoutineTaskStatus = 'DONE' | 'MISSED' | 'PARTIAL';

export interface RoutineTaskLog {
  taskId: string;
  status: RoutineTaskStatus;
  note?: string;
}

export interface DailyRoutineLog extends BaseEntity {
  madrassaId: string;
  academicYearId: string;
  studentId: string;
  classId: string;
  templateId: string; // The ID of the template active at the time
  date: string; // YYYY-MM-DD format
  tasks: Record<string, RoutineTaskLog>; // Keyed by RoutineTask.id
  submitted: boolean;
  submittedAt?: Timestamp;
}

export interface Alumni extends BaseEntity {
  madrassaId: string;
  studentId: string;
  graduatedYearId: string;
  userId?: string;
  alumniId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  admissionNo?: string;
  completionYear?: string;
}
export interface Promotion extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  processedAt?: Timestamp;
  academicYearId: string;
  fromClassId: string;
  toClassId: string;
  promotedCount: number;
  alumniCount: number;
  detainedCount?: number;
  totalStudents?: number;
  students: PromotionStudent[];
  status: PromotionStatus;
}
export interface PromotionStudent {
  studentId: string;
  studentName: string;
  admissionNo?: string;
  resultStatus: string;
  action: PromotionAction;
  previousClassId?: string;
  override?: boolean;
  remarks?: string;
}
export interface PendingUser extends BaseEntity {
  email: string;
  role: Role;
  madrassaId: string;
  passwordHash?: string;
  salt?: string;
  iterations?: number;
  userId?: string;
  generatedEmail?: string;
  name?: string;
  mobile?: string;
  baseSalary?: number;
  contactNumber?: string;
  qualification?: string;
  specialization?: string;
  joiningDate?: Timestamp;
  address?: string;
  bloodGroup?: string;
  identityMarks?: string;
}


// 22. Phase 17: Settings & Admin
export interface GeneralSettings {
  madrassaId: string;
  madrassaName: string;
  shortName: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  logo: string;
  principalName: string;
  academicYearId: string;
  status: Status;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface SettingsGradeBoundary {
  id: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  remarks: string;
}

export interface GradeSettings {
  madrassaId: string;
  grades: SettingsGradeBoundary[];
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface AttendanceSettings {
  madrassaId: string;
  allowPastEditDays: number;
  allowFutureAttendance: boolean;
  attendanceAlertThreshold?: number;
  weekendDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  defaultStatus: "PRESENT" | "ABSENT" | "NONE";
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface PromotionSettings {
  madrassaId: string;
  autoSuggestPromotion: boolean;
  allowManualOverride: boolean;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface FeeSettings {
  madrassaId: string;
  allowPartialPayment: boolean;
  receiptPrefix: string;
  classFeeStructures?: Record<string, string[]>;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface NotificationSettings {
  madrassaId: string;
  noticeRetentionDays: number;
  notificationRetentionDays: number;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface AuditLog {
  id: string;
  madrassaId: string;
  userId: string;
  userName: string;
  role: Role;
  module: AuditLogModule;
  action: AuditLogAction;
  documentId: string;
  documentType: string;
  oldValues?: any;
  newValues?: any;
  createdAt: Timestamp;
}

export interface SubscriptionInfo {
  subscriptionStatus: SubscriptionStatus;
  plan: string;
  startDate: Timestamp;
  expiryDate: Timestamp;
}

export interface PlatformInvoice extends Omit<BaseEntity, 'status'> {
  invoiceNumber: string;
  madrassaId: string;
  amount: number;
  billingPeriod: string; // e.g. "August 2026"
  dueDate: Timestamp;
  status: PlatformInvoiceStatus;
  paidAt?: Timestamp;
  notes?: string;
}

export interface PlatformSettings {
  id?: string;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultPlan: string;
  defaultTrialDays: number;
  enableSmsNotifications: boolean;
  maintenanceMode: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface PlatformSubscriptionPlan extends BaseEntity {
  name: string;
  amount: number;
  studentLimit: number | 'Unlimited';
  isTrial: boolean;
  trialDays?: number;
}

export interface PlatformBoard extends BaseEntity {
  name: string;
  code: string;
}

export interface PlatformQuestionPaper extends BaseEntity {
  title: string;
  boardId: string;
  classLevel: string;
  globalClassId?: string;
  subject: string;
  year: string;
  fileUrl: string;
}

export interface LeaveRequest extends Omit<BaseEntity, 'status'> {
  madrassaId: string;
  type: LeaveRequestType; // STUDENT or STAFF
  requesterId: string; // studentId for student, userId for staff
  requesterName: string; // denormalized for display
  classId?: string; // for student leaves — used to route to class teacher
  parentUserId?: string; // for student leaves — for notifications
  leaveType: LeaveType;
  fromDate: Timestamp;
  toDate: Timestamp;
  reason: string;
  status: LeaveStatus;
  reviewerUserId?: string;
  reviewerName?: string;
  reviewerNote?: string;
  reviewedAt?: Timestamp;
}

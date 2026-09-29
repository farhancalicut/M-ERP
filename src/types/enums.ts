export type Role = 'SUPER_ADMIN' | 'MANAGEMENT' | 'PRINCIPAL' | 'TEACHER' | 'PARENT' | 'ALUMNI';
export type Status = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'ARCHIVED' | 'DELETED' | 'PENDING' | 'SUSPENDED';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'LEFT' | 'TRANSFERRED' | 'ALUMNI' | 'DELETED';
export type ParentStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';
export type AttendanceType = 'STUDENT' | 'TEACHER';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE';
export type FeeType = 'MONTHLY_TUITION' | 'ADMISSION' | 'EXAM' | 'BOOK' | 'UNIFORM' | 'TRANSPORT' | 'CUSTOM';
export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK' | 'UPI' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'ACTIVE' | 'VOID' | 'REJECTED';
export type Gender = 'MALE' | 'FEMALE';
export type Relationship = 'FATHER' | 'MOTHER' | 'GUARDIAN';
export type AcademicYearStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type AssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ExamStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type MarksStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED';
export type ResultStatus = 'PASS' | 'FAIL';
export type PromotionAction = 'PROMOTED' | 'DETAINED' | 'ALUMNI';
export type PromotionStatus = 'COMPLETED' | 'ROLLED_BACK';

export type HomeworkStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type AcademicAssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type StudyMaterialStatus = 'ACTIVE' | 'ARCHIVED';
export type SubmissionStatus = 'SUBMITTED' | 'REVIEWED';

export type ReceiverType = 'ALL' | 'MANAGEMENT' | 'PRINCIPAL' | 'TEACHER' | 'PARENT' | 'ALUMNI' | 'CLASS' | 'STUDENT' | 'USER';
export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
export type NotificationStatus = 'ACTIVE' | 'EXPIRED';
export type NotificationType = 'NOTICE' | 'EXAM' | 'RESULT' | 'ATTENDANCE' | 'HOMEWORK' | 'ASSIGNMENT' | 'FEES' | 'PROMOTION' | 'GENERAL';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationIcon = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// 22. Phase 17: Settings & Audit Logs
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'LOCKED';
export type AuditLogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'LOGIN' | 'LOGOUT' | 'PUBLISH' | 'LOCK' | 'UNLOCK' | 'PROMOTE' | 'PAYMENT' | 'RESULT_PUBLISH';
export type AuditLogModule = 'Students' | 'Parents' | 'Attendance' | 'Examinations' | 'Results' | 'Promotions' | 'Fees' | 'Settings' | 'Notifications' | 'Users';
export type PlatformInvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'SICK' | 'PERSONAL' | 'FAMILY' | 'OTHER';
export type LeaveRequestType = 'STUDENT' | 'STAFF';

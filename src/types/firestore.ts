export type CollectionName = 
  | 'madrassas'
  | 'pendingUsers'
  | 'users'
  | 'academicYears'
  | 'classes'
  | 'subjects'
  | 'teachers'
  | 'teacherClasses'
  | 'parents'
  | 'students'
  | 'studentParents'
  | 'exams'
  | 'examSubjects'
  | 'marks'
  | 'attendance'
  | 'fees'
  | 'studentFees'
  | 'homeworks'
  | 'homeworkSubmissions'
  | 'notifications'
  | 'achievements'
  | 'alumni'
  | 'donations'
  | 'auditLogs'
  | 'settings'
  | 'gradeConfigs'
  | 'counters';

export interface QueryFilter {
  field: string;
  operator: '==' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
  value: unknown;
}

export interface UserPermissions {
  // Administration
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageMadrassa: boolean;
  
  // Academic
  canManageClasses: boolean;
  canManageSubjects: boolean;
  
  // People
  canManageTeachers: boolean;
  canManageStudents: boolean;
  canManageParents: boolean;
  canManageAlumni: boolean;
  
  // Operations
  canManageAttendance: boolean;
  canManageHomework: boolean;
  canManageExams: boolean;
  canManageMarks: boolean;
  canPromoteStudents: boolean;
  
  // Finance
  canManageFees: boolean;
  canManageDonations: boolean;
  
  // Communication
  canManageNotifications: boolean;
}

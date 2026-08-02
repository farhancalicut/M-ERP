import { Role } from "@/types/enums";
import { UserPermissions } from "@/types/permissions";

export function getDefaultPermissions(role: Role): UserPermissions {
  const base: UserPermissions = {
    canManageUsers: false,
    canManageSettings: false,
    canManageMadrassa: false,
    canManageClasses: false,
    canManageSubjects: false,
    canManageTeachers: false,
    canManageStudents: false,
    canManageParents: false,
    canManageAlumni: false,
    canManageAttendance: false,
    canManageHomework: false,
    canManageExams: false,
    canManageMarks: false,
    canPromoteStudents: false,
    canManageFees: false,
    canManageDonations: false,
    canManageNotifications: false,
  };

  switch (role) {
    case 'MANAGEMENT':
      return {
        ...base,
        canManageUsers: true,
        canManageSettings: true,
        canManageMadrassa: true,
        canManageClasses: true,
        canManageSubjects: true,
        canManageTeachers: true,
        canManageStudents: true,
        canManageParents: true,
        canManageAlumni: true,
        canManageAttendance: true,
        canManageHomework: true,
        canManageExams: true,
        canManageMarks: true,
        canPromoteStudents: true,
        canManageFees: true,
        canManageDonations: true,
        canManageNotifications: true,
      };
    case 'PRINCIPAL':
      return {
        ...base,
        canManageClasses: true,
        canManageSubjects: true,
        canManageTeachers: true,
        canManageStudents: true,
        canManageParents: true,
        canManageAlumni: true,
        canManageAttendance: true,
        canManageHomework: true,
        canManageExams: true,
        canManageMarks: true,
        canPromoteStudents: true,
        canManageNotifications: true,
      };
    case 'TEACHER':
      return {
        ...base,
        canManageAttendance: true,
        canManageHomework: true,
        canManageMarks: true,
      };
    default:
      return base;
  }
}

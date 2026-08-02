import { useAuthStore } from "@/stores/authStore";
import { UserPermissions } from "@/types/permissions";

export type Permission = keyof UserPermissions;

export type Module = 
  | "students" 
  | "attendance" 
  | "exams" 
  | "fees" 
  | "reports" 
  | "settings";

const modulePermissionMap: Record<Module, Permission> = {
  students: "canManageStudents",
  attendance: "canManageAttendance",
  exams: "canManageExams",
  fees: "canManageFees",
  reports: "canManageSettings", 
  settings: "canManageSettings"
};

export function usePermission() {
  const { userData, isInitialized } = useAuthStore();

  const hasPermission = (permission: Permission): boolean => {
    if (!isInitialized || !userData?.permissions) return false;
    return userData.permissions[permission] === true;
  };

  const canAccessModule = (module: Module): boolean => {
    const requiredPermission = modulePermissionMap[module];
    return hasPermission(requiredPermission);
  };

  return { hasPermission, canAccessModule, isInitialized };
}

import { useAuthStore } from "@/stores/authStore";
import { Role } from "@/types/enums";

export function useRole() {
  const { userData, isInitialized } = useAuthStore();

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!isInitialized || !userData) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(userData.role);
  };

  return { hasRole, role: userData?.role, isInitialized };
}

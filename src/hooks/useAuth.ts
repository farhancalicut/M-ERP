import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, userData, currentAcademicYear, isInitialized, clearUser } = useAuthStore();
  return { user, userData, currentAcademicYear, isInitialized, clearUser };
}

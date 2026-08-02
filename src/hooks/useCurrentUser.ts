import { useAuthStore } from "@/stores/authStore";

export function useCurrentUser() {
  const { userData } = useAuthStore();
  return userData;
}

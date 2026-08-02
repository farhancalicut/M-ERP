"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { getRoleRedirect } from "../utils/roleRedirect";

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && user && userData) {
      router.replace(getRoleRedirect(userData.role));
    }
  }, [user, userData, isInitialized, router]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  if (user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

"use client";

import { useRole } from "../hooks/useRole";
import { Role } from "@/types/enums";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { NoPermission } from "@/components/shared/NoPermission";

interface RoleGuardProps {
  allowedRoles: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallbackMessage?: boolean;
}

export function RoleGuard({ 
  allowedRoles, 
  children, 
  fallback, 
  showFallbackMessage = true 
}: RoleGuardProps) {
  const { hasRole, isInitialized } = useRole();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!hasRole(allowedRoles)) {
    if (fallback !== undefined) return <>{fallback}</>;
    if (showFallbackMessage) return <NoPermission />;
    return null;
  }

  return <>{children}</>;
}

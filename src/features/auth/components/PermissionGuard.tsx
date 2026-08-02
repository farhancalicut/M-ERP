"use client";

import { usePermission, Permission } from "../hooks/usePermission";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { NoPermission } from "@/components/shared/NoPermission";

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallbackMessage?: boolean;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback, 
  showFallbackMessage = true 
}: PermissionGuardProps) {
  const { hasPermission, isInitialized } = usePermission();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!hasPermission(permission)) {
    if (fallback !== undefined) return <>{fallback}</>;
    if (showFallbackMessage) return <NoPermission />;
    return null;
  }

  return <>{children}</>;
}

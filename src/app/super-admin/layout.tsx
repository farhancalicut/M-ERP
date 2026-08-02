import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";

import { RoleGuard } from "@/features/auth/components/RoleGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['SUPER_ADMIN']}>
        <SuperAdminLayout>{children}</SuperAdminLayout>
      </RoleGuard>
    </ProtectedRoute>
  );
}

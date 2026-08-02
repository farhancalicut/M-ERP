import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

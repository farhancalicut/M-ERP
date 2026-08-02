"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { DashboardStatsCard } from "@/features/reports/components/DashboardStatsCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { useAuthStore } from "@/stores/authStore";
import { Users, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";

export default function TeacherDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async (force = false) => {
    if (userData?.madrassaId && userData?.id) {
      setLoading(true);
      try {
        const data = await dashboardService.getTeacherDashboardStats(userData.madrassaId, userData.id, force);
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadStats();
  }, [userData?.madrassaId, userData?.id]);

  return (
    <RoleGuard allowedRoles="TEACHER">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => loadStats(true)} disabled={loading}>
            Refresh Stats
          </Button>
        </div>
        
        <DashboardSection title="Overview">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DashboardStatsCard title="My Classes" value={stats.myClassesCount} icon={BookOpen} />
              <DashboardStatsCard title="Total Students" value={stats.studentCount} icon={Users} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Failed to load statistics.</div>
          )}
        </DashboardSection>

        {userData?.madrassaId && (
          <DashboardSection title="Notice Board">
            <NoticeBoardWidget madrassaId={userData.madrassaId} role="TEACHER" />
          </DashboardSection>
        )}
      </div>
    </RoleGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { DashboardStatsCard } from "@/features/reports/components/DashboardStatsCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { useAuthStore } from "@/stores/authStore";
import { Users, BookOpen, Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function PrincipalDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async (force = false) => {
    if (userData?.madrassaId) {
      setLoading(true);
      try {
        const data = await dashboardService.getPrincipalDashboardStats(userData.madrassaId, force);
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
  }, [userData?.madrassaId]);

  return (
    <RoleGuard allowedRoles="PRINCIPAL">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Principal Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => loadStats(true)} disabled={loading}>
            Refresh Stats
          </Button>
        </div>
        
        <DashboardSection title="Overview">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardStatsCard title="Total Students" value={stats.totalStudents} icon={Users} />
              <DashboardStatsCard title="Total Classes" value={stats.totalClasses} icon={BookOpen} />
              <DashboardStatsCard title="Total Subjects" value={stats.totalSubjects} icon={Library} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Failed to load statistics.</div>
          )}
        </DashboardSection>
      </div>
    </RoleGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { StatCard } from "@/components/dashboard/StatCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { useAuthStore } from "@/stores/authStore";
import { Users, UserCheck, Users2, BookOpen, UserPlus, CalendarCheck, CreditCard, BellRing, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { PendingLeavesWidget } from "@/features/leave/components/PendingLeavesWidget";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ManagementDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadStats = async (force = false) => {
    if (userData?.madrassaId) {
      setLoading(true);
      try {
        const data = await dashboardService.getManagementDashboardStats(userData.madrassaId, force);
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
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGEMENT']}>
      <div className="space-y-8 pb-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Welcome back, {userData?.displayName || 'Admin'}
            </h1>
            <p className="text-muted-foreground mt-2 text-slate-500 dark:text-slate-400">
              Here is an overview of your institution's status for today, {format(new Date(), 'MMMM do, yyyy')}.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadStats(true)} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Actions */}
        <QuickActionCard 
          title="Quick Actions"
          actions={[
            {
              label: "Add Student",
              icon: UserPlus,
              onClick: () => router.push("/students/new")
            },
            {
              label: "Collect Fees",
              icon: CreditCard,
              onClick: () => router.push("/finance")
            },
            {
              label: "Send Notice",
              icon: BellRing,
              onClick: () => router.push("/notices")
            }
          ]}
        />
        
        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="TOTAL STUDENTS" 
            value={loading ? "..." : stats?.totalStudents || 0} 
            icon={Users} 
            colorTheme="teal"
            trend={{ label: "Active Enrolled" }}
          />
          <StatCard 
            title="TOTAL PARENTS" 
            value={loading ? "..." : stats?.totalParents || 0} 
            icon={Users2} 
            colorTheme="tan"
            trend={{ label: "Registered Accounts" }}
          />
          <StatCard 
            title="TOTAL TEACHERS" 
            value={loading ? "..." : stats?.totalTeachers || 0} 
            icon={UserCheck} 
            colorTheme="mint"
            trend={{ label: "Staff Members" }}
          />
          <StatCard 
            title="TOTAL CLASSES" 
            value={loading ? "..." : stats?.totalClasses || 0} 
            icon={BookOpen} 
            colorTheme="gray"
            trend={{ label: "Active Batches" }}
          />
        </div>

        {/* Bottom Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Action Required: Pending Leaves */}
          <div className="w-full">
            <PendingLeavesWidget />
          </div>
          
          {/* Notice Board */}
          <div className="w-full">
            {userData?.madrassaId && (
              <NoticeBoardWidget 
                madrassaId={userData.madrassaId} 
                role={userData.role} 
              />
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

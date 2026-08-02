"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { StatCard } from "@/components/dashboard/StatCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { useAuthStore } from "@/stores/authStore";
import { Users, UserCheck, GraduationCap, Users2, BookOpen } from "lucide-react";
import { format } from "date-fns";

export default function ManagementDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Welcome back, {userData?.displayName || 'Admin'}
          </h1>
          <p className="text-muted-foreground mt-2 text-slate-500 dark:text-slate-400">
            Here is an overview of your institution's status for today, {format(new Date(), 'MMMM do, yyyy')}.
          </p>
        </div>
        
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
      </div>
    </RoleGuard>
  );
}

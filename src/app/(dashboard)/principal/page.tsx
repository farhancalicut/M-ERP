"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { StatCard } from "@/components/dashboard/StatCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";
import { 
  Users, 
  UserCheck, 
  Users2, 
  BookOpen, 
  UserPlus, 
  CalendarCheck, 
  BellRing, 
  RefreshCw, 
  Calendar, 
  CheckSquare, 
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { PendingLeavesWidget } from "@/features/leave/components/PendingLeavesWidget";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Class } from "@/types/schema";

export default function PrincipalDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const router = useRouter();

  const loadData = async (force = false) => {
    if (userData?.madrassaId) {
      setLoading(true);
      try {
        const statsData = await dashboardService.getPrincipalDashboardStats(userData.madrassaId, force);
        setStats(statsData);
      } catch (err) {
        console.error("Error loading principal stats", err);
      } finally {
        setLoading(false);
      }

      setLoadingClasses(true);
      try {
        const classRes = await classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 6);
        setClasses(classRes.classes || []);
      } catch (err) {
        console.error("Error loading active classes", err);
      } finally {
        setLoadingClasses(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [userData?.madrassaId]);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGEMENT", "PRINCIPAL"]}>
      <div className="space-y-8 pb-10">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Principal Workspace
                </Badge>
                <span className="text-xs text-teal-100/80 font-medium">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {userData?.displayName || "Principal"}
              </h1>
              <p className="text-teal-100 text-sm max-w-xl">
                Monitor school operations, approve staff leaves, review class attendance, and manage daily routines efficiently.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all gap-2 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Stats</span>
            </Button>
          </div>
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
            title="TOTAL TEACHERS"
            value={loading ? "..." : stats?.totalTeachers || 0}
            icon={UserCheck}
            colorTheme="mint"
            trend={{ label: "Active Staff" }}
          />
          <StatCard
            title="REGISTERED PARENTS"
            value={loading ? "..." : stats?.totalParents || 0}
            icon={Users2}
            colorTheme="tan"
            trend={{ label: "Parent Accounts" }}
          />
          <StatCard
            title="ACTIVE CLASSES"
            value={loading ? "..." : stats?.totalClasses || 0}
            icon={BookOpen}
            colorTheme="gray"
            trend={{ label: "Class Batches" }}
          />
        </div>

        {/* Quick Actions Hub */}
        <QuickActionCard
          title="Principal Operations & Shortcuts"
          actions={[
            {
              label: "Daily Routines",
              icon: Calendar,
              onClick: () => router.push("/routines"),
            },
            {
              label: "Class Attendance",
              icon: CheckSquare,
              onClick: () => router.push("/attendance"),
            },
            {
              label: "Leave Approvals",
              icon: CalendarCheck,
              onClick: () => router.push("/leave"),
            },
            {
              label: "Publish Notice",
              icon: BellRing,
              onClick: () => router.push("/notices"),
            },
            {
              label: "Exams & Results",
              icon: GraduationCap,
              onClick: () => router.push("/exams"),
            },
            {
              label: "Admit Student",
              icon: UserPlus,
              onClick: () => router.push("/students/new"),
            },
          ]}
        />

        {/* Main Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Action Required: Pending Leaves Widget */}
            <PendingLeavesWidget />

            {/* Active Classes Card */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    Active Classes Overview
                  </CardTitle>
                  <CardDescription className="text-xs">Quick shortcuts to class routines and attendance</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                  <Link href="/academic-years">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">Loading active classes...</div>
                ) : classes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No active classes configured yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{cls.name}</span>
                            {cls.section && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                Section {cls.section}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Capacity: {cls.capacity || "N/A"} students
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1">
                            <Link href={`/attendance/${cls.id}`}>
                              <CheckSquare className="w-3.5 h-3.5" />
                              Attendance
                            </Link>
                          </Button>
                          <Button variant="secondary" size="sm" asChild className="h-8 text-xs gap-1">
                            <Link href="/routines">
                              <Calendar className="w-3.5 h-3.5" />
                              Routine
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notice Board Widget */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-amber-500" />
                    Notice Board & Announcements
                  </CardTitle>
                  <CardDescription className="text-xs">Recent institution notices and staff circulars</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="text-xs gap-1">
                  <Link href="/notices">
                    Post Notice <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {userData?.madrassaId && (
                  <NoticeBoardWidget madrassaId={userData.madrassaId} role="PRINCIPAL" />
                )}
              </CardContent>
            </Card>

            {/* Academic Hub Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                  Academic Management Hub
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage curriculum, homework, study materials, and exams
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/homework"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary">Homework</p>
                    <p className="text-xs text-muted-foreground">Review assignments & tasks</p>
                  </div>
                </Link>

                <Link
                  href="/study-materials"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary">Study Materials</p>
                    <p className="text-xs text-muted-foreground">Syllabus & class resources</p>
                  </div>
                </Link>

                <Link
                  href="/exams"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary">Exams & Grades</p>
                    <p className="text-xs text-muted-foreground">Schedules & report cards</p>
                  </div>
                </Link>

                <Link
                  href="/promotion"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary">Student Promotion</p>
                    <p className="text-xs text-muted-foreground">Class batch promotions</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

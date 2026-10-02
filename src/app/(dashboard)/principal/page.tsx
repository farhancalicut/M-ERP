"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { StatCard } from "@/components/dashboard/StatCard";
import { dashboardService } from "@/features/reports/services/dashboardService";
import { classService } from "@/features/academic/services/classService";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { routineService } from "@/features/routines/services/routineService";
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
  ShieldCheck,
  Sparkles,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";

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
  const [classMetrics, setClassMetrics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const router = useRouter();

  const loadData = async (force = false) => {
    const madrassaId = userData?.madrassaId;
    if (madrassaId) {
      setLoading(true);
      try {
        const statsData = await dashboardService.getPrincipalDashboardStats(madrassaId, force);
        setStats(statsData);
      } catch (err) {
        console.error("Error loading principal stats", err);
      } finally {
        setLoading(false);
      }

      setLoadingClasses(true);
      try {
        const classRes = await classService.getClasses(madrassaId, "ACTIVE");
        const activeClasses = classRes.classes || [];
        setClasses(activeClasses);

        const todayDate = format(new Date(), "yyyy-MM-dd");
        const metrics: Record<string, any> = {};
        
        await Promise.all(activeClasses.map(async (cls) => {
          if (!cls.id) return;
          let attSubmitted = false;
          let present = 0, absent = 0, total = cls.capacity || 0;
          let routines = 0;
          
          try {
            const att = await attendanceService.getAttendance(madrassaId, cls.id, todayDate);
            if (att && (att.status === "SUBMITTED" || att.status === "LOCKED")) {
              attSubmitted = true;
              present = att.presentCount;
              absent = att.absentCount;
              total = att.totalStudents || total;
            }
            
            const routinesLogs = await routineService.getClassRoutineLogs(madrassaId, cls.id, todayDate);
            routines = routinesLogs.length;
          } catch (err) {
            console.error(`Error loading metrics for class ${cls.id}`, err);
          }
          
          metrics[cls.id] = {
            attendanceSubmitted: attSubmitted,
            presentCount: present,
            absentCount: absent,
            totalStudents: total,
            routinesSubmitted: routines
          };
        }));
        
        setClassMetrics(metrics);
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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



        {/* Main Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Action Required: Pending Leaves Widget */}
            <PendingLeavesWidget />


          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">

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
              <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
                <Link
                  href="/homework"
                  className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-sm font-semibold group-hover:text-primary leading-tight">Homework</p>
                    <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Review assignments</p>
                  </div>
                </Link>

                <Link
                  href="/study-materials"
                  className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-sm font-semibold group-hover:text-primary leading-tight">Materials</p>
                    <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Syllabus resources</p>
                  </div>
                </Link>

                <Link
                  href="/exams"
                  className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-sm font-semibold group-hover:text-primary leading-tight">Exams</p>
                    <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Schedules & grades</p>
                  </div>
                </Link>

                <Link
                  href="/promotion"
                  className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-sm font-semibold group-hover:text-primary leading-tight">Promotion</p>
                    <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Class batches</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Notice Board Widget */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-amber-500" />
                    Notice Board
                  </CardTitle>
                  <CardDescription className="text-xs">Recent institution notices</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="text-xs gap-1">
                  <Link href="/notices">
                    Post Notice
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto pr-2">
                {userData?.madrassaId && (
                  <NoticeBoardWidget madrassaId={userData.madrassaId} role="PRINCIPAL" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full-width Active Classes Overview */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Active Classes Overview
            </CardTitle>
            <CardDescription className="text-sm">
              Real-time daily compliance for attendance and routines across all active classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingClasses ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading all active classes and their daily metrics...
              </div>
            ) : classes.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20">
                No active classes configured. Setup classes in the Academic Settings.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {classes.map((cls) => {
                  if (!cls.id) return null;
                  const metrics = classMetrics[cls.id] || { attendanceSubmitted: false, presentCount: 0, absentCount: 0, totalStudents: cls.capacity || 0, routinesSubmitted: 0 };
                  const attPercent = metrics.totalStudents > 0 
                    ? Math.round((metrics.presentCount / metrics.totalStudents) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={cls.id}
                      className="flex flex-col p-3 sm:p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{cls.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {metrics.totalStudents} Students Enrolled
                          </p>
                        </div>
                      </div>

                      {/* Attendance Metric */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center text-xs font-medium mb-1">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <CheckSquare className="w-3.5 h-3.5" /> Attendance
                          </span>
                          {metrics.attendanceSubmitted ? (
                            <span className="text-emerald-600 font-semibold">{attPercent}%</span>
                          ) : (
                            <span className="text-amber-600 text-[10px] uppercase tracking-wider">Pending</span>
                          )}
                        </div>
                        {metrics.attendanceSubmitted && (
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${attPercent}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Routine Metric */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-xs font-medium">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5" /> Routines
                          </span>
                          {metrics.routinesSubmitted > 0 ? (
                            <span className="text-teal-600 text-[11px] font-semibold">{metrics.routinesSubmitted} Logs</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Pending</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs bg-white dark:bg-slate-950 hover:bg-slate-50">
                          <Link href={`/attendance/${cls.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                            <CheckSquare className="w-3.5 h-3.5 mr-1" />
                            Attendance
                          </Link>
                        </Button>
                        <Button variant="secondary" size="sm" asChild className="h-8 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300">
                          <Link href="/routines">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Routines
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}

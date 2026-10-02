"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { StatCard } from "@/components/dashboard/StatCard";
import { teacherAssignmentService } from "@/features/academic/services/teacherAssignmentService";
import { classService } from "@/features/academic/services/classService";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { useAuthStore } from "@/stores/authStore";
import { 
  Users, 
  BookOpen, 
  CheckSquare, 
  GraduationCap,
  BellRing,
  RefreshCw,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  CalendarCheck
} from "lucide-react";
import { format } from "date-fns";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Class } from "@/types/schema";

export default function TeacherDashboard() {
  const { userData, currentAcademicYear } = useAuthStore();
  const router = useRouter();

  const { data, isLoading: loading, refetch: loadData } = useQuery({
    queryKey: ['teacherDashboard', userData?.madrassaId, userData?.id, currentAcademicYear?.id],
    queryFn: async () => {
      const madrassaId = userData?.madrassaId;
      const userId = userData?.id;
      const academicYearId = currentAcademicYear?.id;

      if (!madrassaId || !userId || !academicYearId) return { classes: [], classMetrics: {} };

      const allClassIds = new Set<string>(userData?.assignedClassIds || []);
      const activeClasses: Class[] = [];
      for (const cid of Array.from(allClassIds)) {
        const c = await classService.getClass(cid);
        if (c && c.status === "ACTIVE") activeClasses.push(c);
      }

      const todayDate = format(new Date(), "yyyy-MM-dd");
      const metrics: Record<string, any> = {};
      
      await Promise.all(activeClasses.map(async (cls) => {
        if (!cls.id) return;
        let attSubmitted = false;
        let present = 0, absent = 0, total = cls.capacity || 0;
        
        try {
          const { collection, query, where, getCountFromServer } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase/firestore");
          const stuQ = query(collection(db, "students"), where("madrassaId", "==", madrassaId), where("classId", "==", cls.id), where("status", "==", "ACTIVE"));
          const countSnap = await getCountFromServer(stuQ);
          total = countSnap.data().count;

          const att = await attendanceService.getAttendance(madrassaId, cls.id, todayDate);
          if (att && (att.status === "SUBMITTED" || att.status === "LOCKED")) {
            attSubmitted = true;
            present = att.presentCount;
            absent = att.absentCount;
            if (att.totalStudents && att.totalStudents > 0) {
               total = att.totalStudents;
            }
          }
        } catch (err) {
          console.error(`Error loading metrics for class ${cls.id}`, err);
        }
        
        metrics[cls.id] = {
          attendanceSubmitted: attSubmitted,
          presentCount: present,
          absentCount: absent,
          totalStudents: total
        };
      }));
      
      return { classes: activeClasses, classMetrics: metrics };
    },
    enabled: !!userData?.madrassaId && !!userData?.id && !!currentAcademicYear?.id,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const classes = data?.classes || [];
  const classMetrics = data?.classMetrics || {};

  const totalStudents = classes.reduce((sum, cls) => sum + (cls.id ? (classMetrics[cls.id]?.totalStudents || 0) : 0), 0);
  const totalClasses = classes.length;
  const pendingAttendance = classes.filter(c => c.id && !classMetrics[c.id]?.attendanceSubmitted).length;

  return (
    <RoleGuard allowedRoles={["TEACHER", "SUPER_ADMIN", "MANAGEMENT"]}>
      <div className="space-y-8 pb-10">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-800 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Teacher Workspace
                </Badge>
                <span className="text-xs text-emerald-100/90 font-medium">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {userData?.displayName || "Teacher"}
              </h1>
              <p className="text-emerald-100 text-sm max-w-xl">
                Manage your assigned classes, take attendance, and interact with your students efficiently.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData()}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all gap-2 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <StatCard
            title="MY CLASSES"
            value={loading ? "..." : totalClasses}
            icon={BookOpen}
            colorTheme="teal"
            trend={{ label: "Assigned active classes" }}
          />
          <StatCard
            title="MY STUDENTS"
            value={loading ? "..." : totalStudents}
            icon={Users}
            colorTheme="mint"
            trend={{ label: "Total active students" }}
          />
          <StatCard
            title="ATTENDANCE PENDING"
            value={loading ? "..." : pendingAttendance}
            icon={CheckSquare}
            colorTheme={pendingAttendance > 0 ? "red" : "teal"}
            trend={{ label: pendingAttendance === 0 ? "All submitted today!" : "Classes need attendance" }}
          />
          <StatCard
            title="ACADEMIC YEAR"
            value={currentAcademicYear?.name || "..."}
            icon={CalendarCheck}
            colorTheme="gray"
            trend={{ label: "Currently active" }}
          />
        </div>

        {/* Main Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          
          {/* Left Column (Wider for Classes) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  My Assigned Classes
                </CardTitle>
                <CardDescription className="text-sm">
                  View and manage attendance for classes assigned to you.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                    Loading your assigned classes...
                  </div>
                ) : classes.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20">
                    No active classes assigned to you yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classes.map((cls) => {
                      if (!cls.id) return null;
                      const metrics = classMetrics[cls.id] || { attendanceSubmitted: false, presentCount: 0, absentCount: 0, totalStudents: cls.capacity || 0 };
                      const attPercent = metrics.totalStudents > 0 
                        ? Math.round((metrics.presentCount / metrics.totalStudents) * 100) 
                        : 0;
                      
                      return (
                        <div
                          key={cls.id}
                          className="flex flex-col p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">{cls.name}</h3>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" /> {metrics.totalStudents} Students
                              </p>
                            </div>
                            {metrics.attendanceSubmitted ? (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                                Pending
                              </Badge>
                            )}
                          </div>

                          {/* Attendance Metric */}
                          {metrics.attendanceSubmitted && (
                            <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                                <span className="text-slate-600 dark:text-slate-400">Attendance Rate</span>
                                <span className="text-emerald-600 font-semibold">{attPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${attPercent}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button 
                              variant={metrics.attendanceSubmitted ? "outline" : "default"} 
                              size="sm" 
                              asChild 
                              className={`w-full ${!metrics.attendanceSubmitted ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                            >
                              <Link href={`/attendance/${cls.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                {metrics.attendanceSubmitted ? 'View Attendance' : 'Take Attendance'}
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

          {/* Right Column (Sidebar) */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Teacher Academic Hub */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" />
                  Academic Tools
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage homework, materials, and exams
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Link
                  href="/homework"
                  className="flex flex-col items-center text-center gap-2 p-3 border rounded-xl hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Homework</p>
                </Link>

                <Link
                  href="/study-materials"
                  className="flex flex-col items-center text-center gap-2 p-3 border rounded-xl hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Materials</p>
                </Link>

                <Link
                  href="/exams"
                  className="flex flex-col items-center text-center gap-2 p-3 border rounded-xl hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Exams</p>
                </Link>

                <Link
                  href="/leave"
                  className="flex flex-col items-center text-center gap-2 p-3 border rounded-xl hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">My Leaves</p>
                </Link>
              </CardContent>
            </Card>

            {/* Notice Board Widget */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-amber-500" />
                  Notice Board
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto pr-2">
                {userData?.madrassaId && (
                  <NoticeBoardWidget madrassaId={userData.madrassaId} role="TEACHER" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

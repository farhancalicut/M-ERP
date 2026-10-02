"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { Student } from "@/features/students/types";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import {
  CheckCircle2, XCircle, AlertCircle, Clock, CreditCard, BookOpen,
  CalendarDays, ChevronRight, ChevronDown, Loader2, Bell, ListTodo, Trophy, User, GraduationCap, Home
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { attendanceReportService } from "@/features/reports/services/attendanceReportService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { resultService } from "@/features/exams/services/resultService";
import { examService } from "@/features/exams/services/examService";
import { classService } from "@/features/academic/services/classService";
import { noticeService } from "@/features/notifications/services/noticeService";
import { routineService } from "@/features/routines/services/routineService";
import { Result, Exam, Notice, Homework } from "@/types/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE" | "NOT_RECORDED";

interface DashboardData {
  todayStatus: AttendanceStatus;
  attendanceSummary: { total: number; present: number; absent: number; leave: number };
  feeDueAmount: number;
  pendingHomeworks: Homework[];
  latestResult: { result: Result; exam: Exam } | null;
  recentNotices: Notice[];
  className: string;
  todayRoutineSubmitted: boolean;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AttendanceHeroCard({ status, summary }: { status: AttendanceStatus; summary: DashboardData["attendanceSummary"] }) {
  const configs: Record<AttendanceStatus, { bg: string; border: string; icon: React.ReactNode; label: string; sub: string }> = {
    PRESENT: {
      bg: "from-emerald-500 to-green-600",
      border: "border-emerald-400",
      icon: <CheckCircle2 className="h-10 w-10 text-white drop-shadow" />,
      label: "Present Today ✓",
      sub: "Your child is attending class today.",
    },
    ABSENT: {
      bg: "from-red-500 to-rose-600",
      border: "border-red-400",
      icon: <XCircle className="h-10 w-10 text-white drop-shadow" />,
      label: "Absent Today",
      sub: "Your child was marked absent. Please contact the madrassa if needed.",
    },
    LATE: {
      bg: "from-amber-500 to-orange-500",
      border: "border-amber-400",
      icon: <Clock className="h-10 w-10 text-white drop-shadow" />,
      label: "Late Arrival",
      sub: "Your child arrived late today.",
    },
    LEAVE: {
      bg: "from-sky-500 to-blue-600",
      border: "border-sky-400",
      icon: <CalendarDays className="h-10 w-10 text-white drop-shadow" />,
      label: "On Leave Today",
      sub: "Your child's leave has been recorded.",
    },
    NOT_RECORDED: {
      bg: "from-slate-500 to-slate-600",
      border: "border-slate-400",
      icon: <AlertCircle className="h-10 w-10 text-white drop-shadow" />,
      label: "Not Recorded Yet",
      sub: "Today's attendance has not been marked yet.",
    },
  };

  const cfg = configs[status];
  const pct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.bg} p-6 shadow-lg border ${cfg.border}/40 text-white`}>
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-0 h-24 w-24 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/80 uppercase tracking-widest">Today's Attendance</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{cfg.label}</h2>
          <p className="mt-1 text-sm text-white/75 max-w-xs">{cfg.sub}</p>
        </div>
        <div className="shrink-0 mt-1">{cfg.icon}</div>
      </div>

      {/* Stats strip */}
      {summary.total > 0 && (
        <div className="relative mt-5 flex items-center gap-6 border-t border-white/20 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{pct}%</div>
            <div className="text-xs text-white/70">This Year</div>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.present}</div>
            <div className="text-xs text-white/70">Present</div>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.absent}</div>
            <div className="text-xs text-white/70">Absent</div>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.leave}</div>
            <div className="text-xs text-white/70">Leave</div>
          </div>
          <div className="ml-auto">
            <Link
              href="/parent/attendance"
              className="flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
            >
              Full Report <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, href, children }: { title: string; icon: React.ReactNode; href?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icon} {title}
        </div>
        {href && (
          <Link href={href} className="text-xs text-primary flex items-center gap-0.5 hover:underline">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { userData, currentAcademicYear } = useAuthStore();

  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // ── 1. Load children list ──
  useEffect(() => {
    async function fetchChildren() {
      if (!userData?.madrassaId || !userData?.id) return;
      setLoadingChildren(true);
      try {
        let parentIdentifier = (userData as any).domainId;
        if (!parentIdentifier) {
          const parentQuery = query(collection(db, "parents"), where("email", "==", userData.email));
          const parentDocs = await getDocs(parentQuery);
          if (!parentDocs.empty && parentDocs.docs[0]) {
            parentIdentifier = parentDocs.docs[0].id;
            updateDoc(doc(db, "users", userData.id), { domainId: parentIdentifier }).catch(() => {});
          } else {
            parentIdentifier = userData.id;
          }
        }
        const students = await studentService.getStudentsByParent(userData.madrassaId, parentIdentifier);
        setChildren(students);
        if (students.length > 0 && students[0]) setSelectedChild(students[0]);
      } catch (e) {
        console.error("Failed to load children", e);
      } finally {
        setLoadingChildren(false);
      }
    }
    fetchChildren();
  }, [userData?.madrassaId, userData?.id, userData?.email, (userData as any)?.domainId]);

  const loadDashboardData = useCallback(async (student: Student) => {
    if (!userData?.madrassaId) return;
    const madrassaId = userData.madrassaId;
    const studentId = student.studentId;

    setLoadingData(true);
    setData(null);

    try {
      let academicYearId = currentAcademicYear?.id;
      if (!academicYearId) {
        const { academicYearService } = await import("@/features/academic/services/academicYearService");
        const res = await academicYearService.getAcademicYears(madrassaId, "ACTIVE", undefined, 1);
        if (res.years.length > 0 && res.years[0]) {
          academicYearId = res.years[0].id as string;
        } else {
          // No active academic year found
          setLoadingData(false);
          return;
        }
      }
      const today = getTodayStr();

      const [
        attendanceDocs,
        todayAttDocs,
        feeDoc,
        homeworkRes,
        resultsArr,
        noticesRes,
        classDoc,
        todayRoutineLog,
      ] = await Promise.all([
        // All attendance this year for stats
        attendanceReportService.generateStudentAttendanceReport(madrassaId, studentId, academicYearId),
        // Today's attendance document
        getDocs(query(
          collection(db, "attendance"),
          where("madrassaId", "==", madrassaId),
          where("classId", "==", student.classId),
          where("date", "==", today)
        )),
        // Fee summary
        studentFeeService.getStudentFees(studentId, academicYearId),
        // Homework for class
        homeworkService.getHomeworks(madrassaId, academicYearId, { classId: student.classId, status: "PUBLISHED" }),
        // Published results
        resultService.getStudentPublishedResults(madrassaId, academicYearId, [studentId]),
        // Notices for PARENT
        noticeService.getNotices(madrassaId, { status: "PUBLISHED", targetRoles: ["PARENT"] }, 3),
        // Class name
        classService.getClass(student.classId),
        // Today's routine log (checks if ANY routine log was submitted for today)
        getDocs(query(
          collection(db, "dailyRoutineLogs"),
          where("madrassaId", "==", madrassaId),
          where("studentId", "==", studentId),
          where("date", "==", today)
        )),
      ]);

      // Today's status
      let todayStatus: AttendanceStatus = "NOT_RECORDED";
      if (!todayAttDocs.empty && todayAttDocs.docs[0]) {
        const todayDoc = todayAttDocs.docs[0].data() as any;
        const rec = todayDoc.attendance?.[studentId];
        if (rec) {
          if (rec.status === "PRESENT") todayStatus = "PRESENT";
          else if (rec.status === "ABSENT") todayStatus = "ABSENT";
          else if (rec.status === "LEAVE") todayStatus = "LEAVE";
          else if (rec.status === "LATE") todayStatus = "LATE";
        }
      }

      // Attendance summary
      let totalDays = 0, presentDays = 0, absentDays = 0, leaveDays = 0;
      for (const doc of attendanceDocs) {
        const rec = doc.attendance?.[studentId];
        if (rec) {
          totalDays++;
          if (rec.status === "PRESENT") presentDays++;
          else if (rec.status === "ABSENT") absentDays++;
          else if (rec.status === "LEAVE") leaveDays++;
        }
      }

      // Pending homework (due >= today)
      const todayMs = new Date(today).getTime();
      const pendingHomeworks = (homeworkRes.homeworks as unknown as Homework[]).filter(h => {
        if (!h.dueDate) return false;
        const dueMs = (h.dueDate as any).toMillis ? (h.dueDate as any).toMillis() : new Date(h.dueDate as any).getTime();
        return dueMs >= todayMs;
      }).slice(0, 4);

      // Latest result
      let latestResult: DashboardData["latestResult"] = null;
      if (resultsArr.length > 0) {
        // Sort by generatedAt desc to get latest
        const sorted = [...resultsArr].sort((a, b) => {
          const aT = (a as any).generatedAt?.toMillis?.() || 0;
          const bT = (b as any).generatedAt?.toMillis?.() || 0;
          return bT - aT;
        });
        const latest = sorted[0];
        if (latest) {
          try {
            const exam = await examService.getExam(latest.examId);
            if (exam) latestResult = { result: latest, exam };
          } catch { /* ignore */ }
        }
      }

      setData({
        todayStatus,
        attendanceSummary: { total: totalDays, present: presentDays, absent: absentDays, leave: leaveDays },
        feeDueAmount: feeDoc?.dueAmount ?? 0,
        pendingHomeworks,
        latestResult,
        recentNotices: noticesRes.notices.slice(0, 3),
        className: classDoc?.name || "",
        todayRoutineSubmitted: todayRoutineLog && !todayRoutineLog.empty ? todayRoutineLog.docs.some(d => d.data().submitted) : false,
      });
    } catch (e) {
      console.error("Dashboard data error:", e);
    } finally {
      setLoadingData(false);
    }
  }, [userData?.madrassaId, currentAcademicYear?.id]);

  useEffect(() => {
    if (selectedChild) loadDashboardData(selectedChild);
  }, [selectedChild, loadDashboardData]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const parentName = (userData as any)?.displayName || "Parent";

  if (loadingChildren) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading your dashboard…</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <GraduationCap className="h-16 w-16 text-slate-300" />
        <h2 className="text-xl font-semibold">No Students Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any student records linked to your account. Please contact the madrassa administration.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 max-w-5xl mx-auto px-4 sm:px-6">

      {/* ── Simple & Elegant Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
        {/* Parent Intro */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {greeting},
          </p>
          <h1 className="text-3xl font-bold tracking-tight capitalize text-foreground">
            {parentName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground/70" /> 
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Child Selector & Info */}
        {selectedChild && (
          <div className="flex flex-row items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 p-3 sm:p-0 rounded-xl sm:rounded-none bg-muted/40 sm:bg-transparent border sm:border-none">
            <div className="text-left sm:text-right flex-1 sm:flex-none">
              <p className="text-sm font-semibold text-foreground capitalize">
                {selectedChild.name.toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {data?.className ? `Class ${data.className} • ` : ""}
                Adm: {selectedChild.admissionNo}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {children.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5" title="Switch Child">
                      <User className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {children.map(child => (
                      <DropdownMenuItem 
                        key={child.studentId} 
                        onClick={() => setSelectedChild(child)} 
                        className={`flex items-center gap-2 cursor-pointer ${selectedChild.studentId === child.studentId ? 'bg-primary/5 font-medium text-primary' : ''}`}
                      >
                        <User className="h-4 w-4 opacity-70" />
                        <span className="capitalize">{child.name.split(" ")[0]}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Link
                href={`/parent/student/${selectedChild.studentId}`}
                className="h-9 w-9 rounded-lg bg-background flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-muted-foreground border shadow-sm"
                title="View Profile"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Data Loading State ── */}
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading student data…</p>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* ── Today's Attendance Hero ── */}
          <AttendanceHeroCard status={data.todayStatus} summary={data.attendanceSummary} />

          {/* ── Highlighted Action Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Fees — highlighted when dues exist */}
            <Link href="/parent/fees">
              <div className={`group relative overflow-hidden rounded-2xl p-5 shadow-md border transition-all cursor-pointer hover:shadow-lg ${
                data.feeDueAmount > 0
                  ? "bg-gradient-to-br from-rose-500 to-red-600 text-white border-rose-400/40"
                  : "bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-400/40"
              }`}>
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Fee Status</p>
                    <p className="mt-1 text-3xl font-bold">
                      {data.feeDueAmount > 0 ? `₹${data.feeDueAmount.toLocaleString()}` : "All Clear"}
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {data.feeDueAmount > 0 ? "Outstanding payment due" : "No pending dues"}
                    </p>
                  </div>
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="relative mt-4 flex items-center justify-between">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    data.feeDueAmount > 0 ? "bg-white/20 text-white" : "bg-white/20 text-white"
                  }`}>
                    {data.feeDueAmount > 0 ? "Tap to pay / view details" : "Fees up to date ✓"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>

            {/* Daily Routine — dynamic highlight based on submitted status */}
            <Link href="/parent/routines">
              <div className={`group relative overflow-hidden rounded-2xl p-5 shadow-md border transition-all cursor-pointer hover:shadow-lg ${
                data.todayRoutineSubmitted
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-400/40"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 text-white border-violet-400/40"
              }`}>
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Daily Routine</p>
                    <p className="mt-1 text-3xl font-bold">Today</p>
                    <p className="mt-1 text-sm text-white/80">
                      {data.todayRoutineSubmitted ? "Thank you for updating the log" : "Submit your child's routine log"}
                    </p>
                  </div>
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    {data.todayRoutineSubmitted ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <ListTodo className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="relative mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
                    {data.todayRoutineSubmitted ? "Submitted ✓" : "Pending - Tap to submit"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>

          </div>

          {/* ── Bottom Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Pending Homework */}
            <SectionCard
              title="Pending Homework"
              icon={<BookOpen className="h-4 w-4 text-amber-500" />}
              href="/parent/homework"
            >
              {data.pendingHomeworks.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending homework. Great job!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {data.pendingHomeworks.map((hw: any) => {
                    const dueMs = hw.dueDate?.toMillis ? hw.dueDate.toMillis() : new Date(hw.dueDate).getTime();
                    const daysLeft = Math.ceil((dueMs - Date.now()) / 86400000);
                    return (
                      <Link key={hw.id} href={`/parent/homework/${hw.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-muted/40 px-1 rounded transition-colors group">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary">{hw.title}</p>
                          <p className="text-xs text-muted-foreground">{hw.subject || ""}</p>
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded-full ${
                          daysLeft <= 1 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : daysLeft <= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Latest Result */}
            <SectionCard
              title="Latest Exam Result"
              icon={<Trophy className="h-4 w-4 text-violet-500" />}
              href="/parent/results"
            >
              {!data.latestResult ? (
                <div className="text-center py-6">
                  <Trophy className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No published results yet.</p>
                </div>
              ) : (() => {
                const studentId = selectedChild?.studentId || "";
                const sResult = data.latestResult.result.students[studentId];
                const isPassed = sResult?.resultStatus === "PASS";
                return (
                  <div className={`rounded-lg border-l-4 p-4 ${isPassed ? "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-l-red-500 bg-red-50 dark:bg-red-900/10"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-sm">{data.latestResult.exam.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {data.latestResult.exam.examType} · {format(data.latestResult.exam.startDate.toDate(), "MMM yyyy")}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPassed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                        {isPassed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    {sResult && (
                      <div className="mt-3 flex gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Marks</p>
                          <p className="font-bold">{sResult.obtainedMarks}/{sResult.totalMarks}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Percentage</p>
                          <p className="font-bold">{sResult.percentage?.toFixed(1)}%</p>
                        </div>
                        {sResult.grade && (
                          <div>
                            <p className="text-muted-foreground text-xs">Grade</p>
                            <p className="font-bold">{sResult.grade}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </SectionCard>

            {/* Notices - Highlighted lightly */}
            <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-900/10 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-200/60 dark:border-sky-800/60 bg-sky-100 dark:bg-sky-900/40">
                <div className="flex items-center gap-2 font-bold text-[15px] text-sky-900 dark:text-sky-100">
                  <Bell className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Notices & Announcements
                </div>
              </div>
              <div className="p-4">
                {data.recentNotices.length === 0 ? (
                  <p className="text-sm text-sky-600/70 dark:text-sky-400/70 text-center py-6">No new notices.</p>
                ) : (
                  <div className="divide-y divide-sky-100 dark:divide-sky-800/40">
                    {data.recentNotices.map(notice => (
                      <div key={notice.id} className="py-4 px-1 first:pt-1 last:pb-1">
                        <p className="text-base font-bold text-sky-950 dark:text-sky-50 leading-tight">{notice.title}</p>
                        <p className="text-sm text-sky-800 dark:text-sky-200/90 mt-1.5 leading-relaxed line-clamp-3">{notice.description}</p>
                        {notice.publishedAt && (
                          <p className="text-xs font-semibold text-sky-600/80 dark:text-sky-400/80 mt-2.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {format((notice.publishedAt as any).toDate?.() || new Date(notice.publishedAt as any), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <SectionCard title="Quick Access" icon={<Home className="h-4 w-4 text-slate-500" />}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Attendance", href: "/parent/attendance", icon: <CalendarDays className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
                  { label: "Fees", href: "/parent/fees", icon: <CreditCard className="h-4 w-4" />, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
                  { label: "Homework", href: "/parent/homework", icon: <BookOpen className="h-4 w-4" />, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
                  { label: "Results", href: "/parent/results", icon: <Trophy className="h-4 w-4" />, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
                  { label: "Routine", href: "/parent/routines", icon: <ListTodo className="h-4 w-4" />, color: "text-sky-600 bg-sky-50 dark:bg-sky-900/20" },
                  { label: "Leave", href: "/parent/leave", icon: <CalendarDays className="h-4 w-4" />, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group border"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium group-hover:text-primary">{item.label}</span>
                  </Link>
                ))}
              </div>
            </SectionCard>

          </div>
        </div>
      ) : null}
    </div>
  );
}

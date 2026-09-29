"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { Student } from "@/features/students/types";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { resultService } from "@/features/exams/services/resultService";
import { examService } from "@/features/exams/services/examService";
import { attendanceReportService } from "@/features/reports/services/attendanceReportService";
import { classService } from "@/features/academic/services/classService";
import { homeworkService } from "@/features/academic/services/homeworkService";
import {
  ArrowLeft, User, GraduationCap, CalendarDays, MapPin,
  HeartPulse, Star, BookOpen, ClipboardList, Banknote, Trophy,
  ChevronRight, Loader2, CreditCard, BarChart3, Users,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";

function fmtDate(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  try { return format(ts.toDate(), "dd MMM yyyy"); } catch { return "—"; }
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-primary">{icon}</span>
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
    </div>
  );
}

export default function StudentProfileClient({ studentId }: { studentId: string }) {
  const { userData, currentAcademicYear } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    const madrassaId = userData.madrassaId;
    const academicYearId = currentAcademicYear.id;
    const parentId = (userData as any).domainId || userData.id;

    const loadData = async () => {
      try {
        const [student, fee, payments, results, attendance] = await Promise.all([
          studentService.getStudent(studentId),
          studentFeeService.getStudentFees(studentId, academicYearId),
          paymentService.getStudentPayments(madrassaId, studentId, academicYearId),
          resultService.getStudentPublishedResults(madrassaId, academicYearId, [studentId]),
          attendanceReportService.generateStudentAttendanceReport(madrassaId, studentId, academicYearId),
        ]);

        if (!student || student.madrassaId !== madrassaId || student.parentId !== parentId) {
          router.push("/parent");
          return;
        }

        const [cls, hwResult] = await Promise.all([
          classService.getClass(student.classId).catch(() => null),
          homeworkService.getHomeworks(madrassaId, academicYearId, { classId: student.classId, status: "PUBLISHED" }).catch(() => ({ homeworks: [] })),
        ]);
        const homeworks = (hwResult as any).homeworks ?? [];

        const enrichedResults = await Promise.all(
          results.slice(0, 5).map(async (r: any) => {
            const exam = await examService.getExam(r.examId).catch(() => null);
            return { result: r, exam };
          })
        );

        const present = attendance.filter((a: any) => a.attendance?.[studentId]?.status === "PRESENT").length;
        const absent = attendance.filter((a: any) => a.attendance?.[studentId]?.status === "ABSENT").length;
        const leave = attendance.filter((a: any) => a.attendance?.[studentId]?.status === "LEAVE").length;
        const total = attendance.length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;

        const today = new Date();
        const pending = homeworks.filter((h: any) => {
          try { return (h.dueDate?.toDate ? h.dueDate.toDate() : new Date(h.dueDate)) >= today; } catch { return false; }
        });

        setProfile({ student, fee, payments, results: enrichedResults, className: cls?.name || "", pct, present, absent, leave, total, pending });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userData, currentAcademicYear, studentId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading student profile…</p>
      </div>
    );
  }

  if (!profile) return null;

  const { student, fee, payments, results, className, pct, present, absent, leave, pending } = profile;
  const s: Student = student;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* ── Hero ── compact row on mobile */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-white px-4 py-5 shadow-lg overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/20 overflow-hidden">
            {s.photoUrl
              ? <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
              : <User className="h-7 w-7" />}
          </div>
          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight capitalize leading-tight truncate">{s.name.toLowerCase()}</h1>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {className && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20">Class {className}</span>}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20">{s.admissionNo}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "bg-emerald-400/30" : "bg-red-400/30"}`}>{s.status}</span>
            </div>
          </div>
          {/* Fees shortcut */}
          <Link href={`/parent/fees/${s.studentId}`} className="shrink-0 flex flex-col items-center gap-0.5 bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Fees</span>
          </Link>
        </div>
      </div>

      {/* ── Attendance — horizontal scroll strip ── */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Attendance</h2>
          </div>
          <Link href="/parent/attendance" className="text-xs font-semibold text-primary flex items-center gap-0.5">
            Report <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {[
            { val: `${pct}%`, label: "Rate", cls: pct >= 85 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : pct >= 70 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
            { val: present, label: "Present", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
            { val: absent, label: "Absent", cls: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
            { val: leave, label: "Leave", cls: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
          ].map(({ val, label, cls }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 flex flex-col items-center shrink-0 flex-1 min-w-[70px] ${cls}`}>
              <p className="text-xl font-extrabold leading-none">{val}</p>
              <p className="text-[11px] font-medium mt-1 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fee Summary ── */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Fee Summary</h2>
          </div>
          {fee && (
            <Link href={`/parent/fees/${s.studentId}`} className="text-xs font-semibold text-primary flex items-center gap-0.5">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        {!fee ? (
          <p className="text-sm text-muted-foreground text-center py-3">No fee record for this academic year.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/40 p-3 text-center border">
                <p className="text-[11px] text-muted-foreground font-medium">Total</p>
                <p className="text-base font-extrabold mt-0.5">₹{(fee.totalAmount || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Paid</p>
                <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">₹{(fee.paidAmount || 0).toLocaleString()}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${(fee.dueAmount || 0) > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"}`}>
                <p className={`text-[11px] font-medium ${(fee.dueAmount || 0) > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>Due</p>
                <p className={`text-base font-extrabold mt-0.5 ${(fee.dueAmount || 0) > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  ₹{(fee.dueAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>
            {payments && payments.length > 0 && (
              <div className="mt-3 space-y-0">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Recent Payments</p>
                {payments.slice(0, 2).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{p.paymentMethod || "Payment"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(p.paymentDate)}</p>
                    </div>
                    <span className="font-bold text-sm text-emerald-600">+₹{p.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Exam Results ── */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Exam Results</h2>
          </div>
          <Link href="/parent/results" className="text-xs font-semibold text-primary flex items-center gap-0.5">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No published results yet.</p>
        ) : (
          <div className="space-y-2">
            {results.map(({ result, exam }: any) => {
              const sr = result.students?.[s.studentId];
              if (!sr) return null;
              const passed = sr.resultStatus === "PASS";
              return (
                <div key={result.id} className={`rounded-xl border-l-4 px-3 py-2.5 ${passed ? "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/10" : "border-l-red-500 bg-red-50/60 dark:bg-red-900/10"}`}>
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-semibold text-sm leading-tight truncate">{exam?.name || "Exam"}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                      {passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs">
                    <span className="text-muted-foreground">Marks: <strong className="text-foreground">{sr.obtainedMarks}/{sr.totalMarks}</strong></span>
                    <span className="text-muted-foreground">{sr.percentage?.toFixed(1)}%</span>
                    {sr.grade && <span className="text-muted-foreground">Grade: <strong className="text-foreground">{sr.grade}</strong></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pending Homework ── */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Pending Homework</h2>
          </div>
          <Link href="/parent/homework" className="text-xs font-semibold text-primary flex items-center gap-0.5">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No pending homework 🎉</p>
        ) : (
          <div className="space-y-0">
            {pending.slice(0, 4).map((hw: any) => {
              let dueStr = "—";
              let isUrgent = false;
              try {
                const d = hw.dueDate?.toDate ? hw.dueDate.toDate() : new Date(hw.dueDate);
                dueStr = format(d, "dd MMM");
                isUrgent = (d.getTime() - Date.now()) < 86400000 * 2;
              } catch { /* ignore */ }
              return (
                <div key={hw.id} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{hw.title}</p>
                    {hw.subject && <p className="text-xs text-muted-foreground">{hw.subject}</p>}
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${isUrgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                    {dueStr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Personal Info — compact 2-col grid ── */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Personal Info</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: "Date of Birth", value: fmtDate(s.dob) },
            { label: "Gender", value: s.gender === "MALE" ? "Male" : s.gender === "FEMALE" ? "Female" : s.gender || "—" },
            { label: "Blood Group", value: s.bloodGroup || "—" },
            { label: "Admission Date", value: fmtDate(s.admissionDate) },
            { label: "Guardian", value: s.guardianRelation || "—" },
            { label: "Address", value: s.address || "—" },
            ...(s.identityMark ? [{ label: "Identity Mark", value: s.identityMark }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
              <p className="text-sm font-semibold mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
          {s.medicalNotes && (
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground font-medium">Medical Notes</p>
              <p className="text-sm font-semibold mt-0.5">{s.medicalNotes}</p>
            </div>
          )}
          {s.majorAchievements && (
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground font-medium">Achievements</p>
              <p className="text-sm font-semibold mt-0.5">{s.majorAchievements}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

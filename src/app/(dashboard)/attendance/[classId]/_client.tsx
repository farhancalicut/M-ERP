"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Attendance, Class, DailyAttendanceRecord } from "@/types/schema";
import { Student } from "@/features/students/types";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { studentService } from "@/features/students/services/studentService";
import { classService } from "@/features/academic/services/classService";
import { attendanceSettingsService } from "@/features/settings/services/attendanceSettingsService";
import { AttendanceForm } from "@/features/attendance/components/AttendanceForm";
import { AttendanceStatusBadge } from "@/features/attendance/components/AttendanceStatusBadge";
import { AttendanceLockDialog } from "@/features/attendance/components/AttendanceLockDialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LockIcon, UnlockIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import Link from "next/link";

export default function AttendanceMarkingPage({ params }: { params: { classId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStr = searchParams.get("date");
  
  const { userData } = useAuthStore();
  const currentAcademicYear = useAuthStore(state => state.currentAcademicYear);
  const madrassaId = userData?.madrassaId;
  const user = userData;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [cls, setCls] = useState<Class | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  useEffect(() => {
    if (!madrassaId || !currentAcademicYear || !user || !dateStr) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Verify class exists and get settings
        const [classData, settingsData] = await Promise.all([
          classService.getClass(params.classId),
          attendanceSettingsService.getAttendanceSettings(madrassaId)
        ]);
        
        if (!classData) {
          toast.error("Class not found");
          router.push("/attendance");
          return;
        }
        setCls(classData);
        setSettings(settingsData);

        // 2. Fetch or Initialize Attendance Document
        let doc = await attendanceService.getAttendance(madrassaId, params.classId, dateStr);
        if (!doc) {
          // Verify permissions before creating
          if (!attendanceService.canEditAttendance(dateStr, user.role, settingsData || undefined)) {
            toast.error("You cannot create attendance for this date.");
            router.push("/attendance");
            return;
          }
          
          doc = await attendanceService.initializeDraft(
            madrassaId,
            currentAcademicYear.id,
            params.classId,
            dateStr,
            user.uid,
            user.role,
            settingsData || undefined
          );
        }
        
        setAttendance(doc);

        // 3. Fetch Students snapshot for this attendance doc
        if (doc.studentIds && doc.studentIds.length > 0) {
          const loadedStudents = await studentService.getStudentsByIds(madrassaId, doc.studentIds);
          setStudents(loadedStudents);
        } else {
          setStudents([]);
        }
        
      } catch (error: unknown) {
        console.error("Failed to load attendance:", error);
        toast.error((error instanceof Error ? error.message : "") || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [madrassaId, currentAcademicYear, user, params.classId, dateStr, router]);

  if (!dateStr) {
    return <div>Missing date parameter</div>;
  }

  const canEdit = user ? attendanceService.canEditAttendance(dateStr, user.role, settings || undefined) : false;
  const isWeekend = settings && settings.weekendDays.includes(new Date(dateStr).getDay());
  const isLocked = attendance?.locked || false;
  const isReadOnly = isLocked || !canEdit;
  
  const isPrincipalOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'PRINCIPAL';

  const handleSaveDraft = async (records: Record<string, DailyAttendanceRecord>) => {
    if (!user || !attendance) return;
    try {
      setIsSubmitting(true);
      await attendanceService.saveDraft(
        params.classId,
        dateStr,
        records,
        user.uid,
        user.role
      );
      toast.success("Draft saved successfully");
      // Update local state
      setAttendance(prev => prev ? { ...prev, attendance: records } : null);
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : "") || "Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (records: Record<string, DailyAttendanceRecord>) => {
    if (!user || !attendance) return;
    try {
      setIsSubmitting(true);
      await attendanceService.submitAttendance(
        params.classId,
        dateStr,
        records,
        user.uid,
        user.role
      );
      toast.success("Attendance submitted successfully");
      
      // Reload completely to update counts and status
      const updated = await attendanceService.getAttendance(madrassaId!, params.classId, dateStr);
      setAttendance(updated);
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : "") || "Failed to submit attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!user || !attendance) return;
    try {
      setIsSubmitting(true);
      if (isLocked) {
        await attendanceService.unlockAttendance(params.classId, dateStr, user.uid, user.role);
        toast.success("Attendance unlocked");
      } else {
        await attendanceService.lockAttendance(params.classId, dateStr, user.uid, user.role);
        toast.success("Attendance locked");
      }
      setLockDialogOpen(false);
      
      const updated = await attendanceService.getAttendance(madrassaId!, params.classId, dateStr);
      setAttendance(updated);
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : "") || "Failed to modify lock status");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/attendance">
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance: {cls?.name}</h1>
          <p className="text-muted-foreground">{format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {attendance && <AttendanceStatusBadge status={attendance.status} />}
          {isPrincipalOrAdmin && attendance && (
            <Button 
              variant={isLocked ? "default" : "destructive"} 
              onClick={() => setLockDialogOpen(true)}
            >
              {isLocked ? (
                <><UnlockIcon className="w-4 h-4 mr-2" /> Unlock</>
              ) : (
                <><LockIcon className="w-4 h-4 mr-2" /> Lock</>
              )}
            </Button>
          )}
        </div>
      </div>

      {isWeekend && (
        <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Weekend Warning</p>
            <p className="text-sm mt-1">This date falls on a weekend based on your configuration. Proceed carefully.</p>
          </div>
        </div>
      )}

      {!canEdit && !isPrincipalOrAdmin && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
          You do not have permission to edit attendance for this date.
        </div>
      )}

      {attendance && (
        <AttendanceForm
          attendance={attendance}
          students={students}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          disabled={isReadOnly}
        />
      )}

      <AttendanceLockDialog
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        isLocked={isLocked}
        date={format(parseISO(dateStr), 'MMM d, yyyy')}
        onConfirm={handleToggleLock}
        isLoading={isSubmitting}
      />
    </div>
  );
}

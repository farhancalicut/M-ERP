"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Class, Attendance } from "@/types/schema";
import { classService } from "@/features/academic/services/classService";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { attendanceSettingsService } from "@/features/settings/services/attendanceSettingsService";
import { Role } from "@/types/enums";
import { AttendanceSettings } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Lock, Unlock, Edit, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ClassWithAttendance = Class & {
  attendanceRecord?: Attendance | null;
  statusText: string;
};

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const { userData, currentAcademicYear, isInitialized } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const user = userData;
  
  const [classes, setClasses] = useState<ClassWithAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isPrincipalOrAdmin = user?.role === "PRINCIPAL" || user?.role === "MANAGEMENT" || user?.role === "SUPER_ADMIN";

  const [activeYear, setActiveYear] = useState<{ id: string; name: string } | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);

  useEffect(() => {
    if (currentAcademicYear) {
      setActiveYear(currentAcademicYear);
    } else if (madrassaId) {
      academicYearService.getAcademicYears(madrassaId, "ACTIVE", undefined, 1).then(res => {
        if (res.years.length > 0) {
          setActiveYear({ id: res.years[0]!.id as string, name: res.years[0]!.name });
        }
      }).catch(console.error);
    }
  }, [currentAcademicYear, madrassaId]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!madrassaId || !activeYear) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [classesRes, settingsRes] = await Promise.all([
          classService.getClasses(madrassaId, "ALL", undefined, 100),
          attendanceSettingsService.getAttendanceSettings(madrassaId)
        ]);
        
        setSettings(settingsRes);
        const allClasses = classesRes.classes;
        
        let filteredClasses = allClasses;
        if (user?.role === "TEACHER") {
          const assignedIds = user.assignedClassIds || [];
          filteredClasses = allClasses.filter(c => assignedIds.includes(c.id as string));
        }

        // Fetch attendance for all these classes for the selected date
        const attendancePromises = filteredClasses.map(c => 
          attendanceService.getAttendance(madrassaId, c.id as string, selectedDate)
        );
        
        const attendanceResults = await Promise.all(attendancePromises);

        const combinedData: ClassWithAttendance[] = filteredClasses.map((c, index) => {
          const record = attendanceResults[index];
          let statusText = "Not Taken";
          if (record) {
            if (record.status === "SUBMITTED") statusText = "Submitted";
            else if (record.status === "LOCKED") statusText = "Locked";
            else statusText = "Draft";
          }

          return {
            ...c,
            attendanceRecord: record || null,
            statusText
          };
        });

        setClasses(combinedData);
      } catch (error) {
        console.error("Failed to load attendance data:", error);
        toast.error("Failed to load attendance data: " + (error instanceof Error ? error.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [madrassaId, activeYear, user, selectedDate, isInitialized]);

  const handleMarkAllPresent = async (classItem: ClassWithAttendance) => {
    if (!madrassaId || !activeYear || !user?.id) return;
    
    setProcessingId(classItem.id as string);
    try {
      // 1. Initialize Draft (marks everyone present by default)
      const draft = await attendanceService.initializeDraft(
        madrassaId,
        activeYear.id,
        classItem.id as string,
        selectedDate,
        user.id,
        user.role as Role
      );

      // 2. Submit it immediately
      await attendanceService.submitAttendance(
        classItem.id as string,
        selectedDate,
        draft.attendance,
        user.id,
        user.role as Role
      );

      toast.success(`${classItem.name} marked as all present`);
      
      // Update local state
      const updatedRecord = await attendanceService.getAttendance(madrassaId, classItem.id as string, selectedDate);
      setClasses(prev => prev.map(c => c.id === classItem.id ? { ...c, attendanceRecord: updatedRecord, statusText: "Submitted" } : c));
    } catch (error: any) {
      toast.error(error.message || "Failed to mark all present");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleLock = async (classItem: ClassWithAttendance, isLocked: boolean) => {
    if (!user?.id) return;
    setProcessingId(classItem.id as string);
      
    let draft = classItem.attendanceRecord;
    if (!draft) {
      draft = await attendanceService.initializeDraft(
        madrassaId!, 
        activeYear!.id, 
        classItem.id as string, 
        selectedDate, 
        user.id, 
        user.role as Role, 
        settings || undefined
      );
    }

    try {
      if (isLocked) {
        await attendanceService.unlockAttendance(classItem.id as string, selectedDate, user.id, user.role as Role);
        toast.success("Attendance unlocked");
      } else {
        await attendanceService.lockAttendance(classItem.id as string, selectedDate, user.id, user.role as Role);
        toast.success("Attendance locked");
      }
      
      const updatedRecord = await attendanceService.getAttendance(madrassaId!, classItem.id as string, selectedDate);
      setClasses(prev => prev.map(c => c.id === classItem.id ? { 
        ...c, 
        attendanceRecord: updatedRecord, 
        statusText: updatedRecord?.status === "LOCKED" ? "Locked" : "Submitted" 
      } : c));
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle lock");
    } finally {
      setProcessingId(null);
    }
  };

  const getMinMaxDates = () => {
    const today = new Date();
    if (user?.role === "TEACHER") {
      return {
        min: format(subDays(today, 3), 'yyyy-MM-dd'),
        max: format(today, 'yyyy-MM-dd')
      };
    }
    return { min: undefined, max: undefined };
  };

  const { min, max } = getMinMaxDates();

  const getStatusBadge = (statusText: string) => {
    switch (statusText) {
      case "Locked": return <Badge variant="default" className="bg-slate-700">Locked</Badge>;
      case "Submitted": return <Badge variant="default" className="bg-green-600">Submitted</Badge>;
      case "Draft": return <Badge variant="secondary">Draft</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Not Taken</Badge>;
    }
  };

  const overallStats = classes.reduce((acc, c) => {
    if (c.attendanceRecord) {
      acc.present += c.attendanceRecord.presentCount || 0;
      acc.absent += c.attendanceRecord.absentCount || 0;
      acc.leave += c.attendanceRecord.leaveCount || 0;
      acc.total += (c.attendanceRecord.presentCount || 0) + (c.attendanceRecord.absentCount || 0) + (c.attendanceRecord.leaveCount || 0);
    }
    return acc;
  }, { present: 0, absent: 0, leave: 0, total: 0 });
  const attendancePercentage = overallStats.total > 0 ? Math.round((overallStats.present / overallStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor daily attendance across all classes.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-2 shadow-sm">
          <Label htmlFor="date-picker" className="font-medium px-2">Date:</Label>
          <Input 
            id="date-picker"
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            min={min}
            max={max}
            className="w-[160px] border-none bg-muted/50 focus-visible:ring-0"
          />
        </div>
      </div>

      {!loading && classes.length > 0 && isPrincipalOrAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{attendancePercentage}%</div>
              <p className="text-xs text-muted-foreground mt-1">Based on submitted records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Present</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overallStats.present}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Absent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overallStats.absent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{overallStats.leave}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Class Overview ({format(new Date(selectedDate), 'MMM dd, yyyy')})</CardTitle>
          <CardDescription>
            {user?.role === "TEACHER" 
              ? "Showing your assigned classes for the selected date." 
              : "Overview of all classes for the selected date."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings && settings.weekendDays.includes(new Date(selectedDate).getDay()) && (
            <div className="mb-6 p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Weekend Warning</p>
                <p className="text-sm mt-1">The selected date falls on a weekend based on your configuration. You can still mark attendance if this is a special working day.</p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No Classes Found</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                {user?.role === "TEACHER" 
                  ? "You have not been assigned to any classes." 
                  : "There are no active classes or academic years in the system. Please ensure an Academic Year is active."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Class Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Stats (P/A/L)</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {classes.map((c) => {
                    const rec = c.attendanceRecord;
                    const isLocked = rec?.status === "LOCKED";
                    const isProcessing = processingId === c.id;

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-base">{c.name}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.statusText)}</td>
                        <td className="px-4 py-3 text-center">
                          {rec ? (
                            <div className="flex items-center justify-center gap-2 text-xs font-medium">
                              <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">{rec.presentCount} P</span>
                              <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded">{rec.absentCount} A</span>
                              <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">{rec.leaveCount} L</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {!rec && isPrincipalOrAdmin && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={isProcessing}
                              onClick={() => handleMarkAllPresent(c)}
                            >
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />}
                              All Present
                            </Button>
                          )}
                          
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => router.push(`/attendance/${c.id}?date=${selectedDate}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {rec && isLocked && !isPrincipalOrAdmin ? "View" : "Edit"}
                          </Button>

                          {rec && isPrincipalOrAdmin && (
                            <Button 
                              variant={isLocked ? "outline" : "default"}
                              size="sm" 
                              disabled={isProcessing}
                              onClick={() => handleToggleLock(c, isLocked)}
                              className={isLocked ? "border-slate-300" : "bg-slate-700 hover:bg-slate-800"}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isLocked ? (
                                <><Unlock className="h-4 w-4 mr-1" /> Unlock</>
                              ) : (
                                <><Lock className="h-4 w-4 mr-1" /> Lock</>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

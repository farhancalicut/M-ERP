"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays, addDays, isToday, parseISO } from "date-fns";
import { DailyRoutineLog, Class } from "@/types/schema";
import { routineService } from "@/features/routines/services/routineService";
import { classService } from "@/features/academic/services/classService";
import { studentService } from "@/features/students/services/studentService";
import { useAuthStore } from "@/stores/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Student } from "@/features/students/types";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Info,
  RotateCcw,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RoutineReports() {
  const { user, userData } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<DailyRoutineLog[]>([]);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<{ student: Student; log: DailyRoutineLog; date: Date } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SUBMITTED" | "PENDING">("ALL");

  useEffect(() => {
    if (!userData?.madrassaId) return;
    Promise.all([
      classService.getClasses(userData.madrassaId, "ALL"),
      routineService.getTemplates(userData.madrassaId)
    ]).then(([classRes, tplRes]) => {
      let availableClasses = classRes.classes;
      if (userData.role === "TEACHER") {
        const teacherUid = userData.uid || userData.id || user?.uid;
        const assignedIds = userData.assignedClassIds || [];
        availableClasses = classRes.classes.filter(c => 
          (c.id && assignedIds.includes(c.id)) || 
          (teacherUid && c.classTeacherId === teacherUid)
        );
      }

      setClasses(availableClasses);
      if (availableClasses[0]?.id) {
        setSelectedClass(availableClasses[0].id);
      } else {
        setSelectedClass("");
      }
      
      const tplMap: Record<string, any> = {};
      tplRes.forEach(t => { if (t.id) tplMap[t.id] = t; });
      setTemplates(tplMap);
      
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load initial data");
      setLoading(false);
    });
  }, [userData?.madrassaId, userData?.role, userData?.assignedClassIds, userData?.uid, userData?.id, user?.uid]);

  useEffect(() => {
    if (!userData?.madrassaId || !selectedClass) return;
    const fetchReportData = async () => {
      setFetchingReport(true);
      try {
        const [studentsRes, logsRes] = await Promise.all([
          studentService.searchStudents(userData.madrassaId, { classId: selectedClass }),
          routineService.getClassRoutineLogs(
            userData.madrassaId, 
            selectedClass, 
            format(selectedDate, "yyyy-MM-dd")
          )
        ]);
        setStudents(studentsRes.students);
        setLogs(logsRes);
      } catch (error) {
        toast.error("Failed to load routine report");
      } finally {
        setFetchingReport(false);
      }
    };
    fetchReportData();
  }, [userData?.madrassaId, selectedClass, selectedDate]);

  // Derived metrics
  const totalStudents = students.length;
  
  const submittedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    logs.forEach(l => {
      if (l.submitted) ids.add(l.studentId);
    });
    return ids;
  }, [logs]);

  const submittedCount = useMemo(() => {
    return students.filter(s => submittedStudentIds.has(s.studentId)).length;
  }, [students, submittedStudentIds]);

  const pendingCount = totalStudents - submittedCount;

  const avgScore = useMemo(() => {
    const submittedLogs = logs.filter(l => l.submitted);
    if (submittedLogs.length === 0) return null;
    
    let totalScorePercent = 0;
    let validCount = 0;

    submittedLogs.forEach(l => {
      const tasks = Object.values(l.tasks || {});
      if (tasks.length > 0) {
        const done = tasks.filter((t: any) => t.status === "DONE").length;
        const partial = tasks.filter((t: any) => t.status === "PARTIAL").length;
        const percent = Math.round(((done + partial * 0.5) / tasks.length) * 100);
        totalScorePercent += percent;
        validCount++;
      }
    });

    return validCount > 0 ? Math.round(totalScorePercent / validCount) : null;
  }, [logs]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (student.admissionNo && student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      const hasSubmitted = submittedStudentIds.has(student.studentId);
      if (filterStatus === "SUBMITTED") return hasSubmitted;
      if (filterStatus === "PENDING") return !hasSubmitted;
      return true;
    });
  }, [students, submittedStudentIds, searchQuery, filterStatus]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-sm text-muted-foreground">Loading routine data...</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-8 text-center border rounded-xl bg-card shadow-2xs max-w-md mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">No Classes Assigned</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          {userData?.role === "TEACHER" 
            ? "You do not have any classes assigned to your profile yet. Please ask the administrator or principal to assign your classes."
            : "No classes found for this institution."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Class Selector & Date Stepper */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-card border rounded-xl shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-[220px]">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-10 bg-background font-medium">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-background border rounded-lg p-1 shadow-2xs">
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSelectedDate(prev => subDays(prev, 1))}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="relative flex items-center justify-center px-2 py-1 min-w-[130px] sm:min-w-[150px] text-center cursor-pointer group">
              <CalendarIcon className="h-4 w-4 mr-1.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span className="text-xs sm:text-sm font-medium select-none truncate">
                {isToday(selectedDate) ? "Today, " : ""}{format(selectedDate, "MMM d, yyyy")}
              </span>
              <input 
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={format(selectedDate, "yyyy-MM-dd")}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(parseISO(e.target.value));
                  }
                }}
              />
            </div>

            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              disabled={isToday(selectedDate)}
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isToday(selectedDate) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-10 text-xs gap-1.5 shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Today</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-card border rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            Total Students
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{totalStudents}</div>
        </div>

        <div className="p-3.5 bg-card border rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Submitted
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{submittedCount}</div>
        </div>

        <div className="p-3.5 bg-card border rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Pending
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{pendingCount}</div>
        </div>

        <div className="p-3.5 bg-card border rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Avg Score
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {avgScore !== null ? `${avgScore}%` : "—"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search student by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/40 rounded-lg text-xs self-start sm:self-auto border">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              filterStatus === "ALL" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({totalStudents})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("SUBMITTED")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              filterStatus === "SUBMITTED" ? "bg-background text-emerald-600 shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Submitted ({submittedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("PENDING")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              filterStatus === "PENDING" ? "bg-background text-amber-600 shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pending ({pendingCount})
          </button>
        </div>
      </div>

      {/* Subtle Hint */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Info className="w-3.5 h-3.5 text-primary/70 shrink-0" />
        <span>Tap any routine badge to inspect individual tasks and parent comments.</span>
      </div>

      {/* Student List */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-2xs">
        {fetchingReport ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
            <p className="text-sm">Updating report for {format(selectedDate, "MMM d, yyyy")}...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground px-4">
            <p className="text-base font-medium text-foreground mb-1">
              {students.length === 0 ? "No students found in this class." : "No matching students found."}
            </p>
            <p className="text-xs text-muted-foreground">
              {students.length === 0 
                ? "Assign students to this class in the academic section." 
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredStudents.map((student) => {
              const dateStr = format(selectedDate, "yyyy-MM-dd");
              const dayLogs = logs.filter(l => l.studentId === student.studentId && l.date === dateStr && l.submitted);
              
              const initials = (student.name || "")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(n => n[0]?.toUpperCase() || "")
                .join("");

              return (
                <div 
                  key={student.studentId} 
                  className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/20 transition-colors gap-3"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 select-none">
                      {initials || "#"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">
                        {student.name}
                      </p>
                      {student.admissionNo && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          ID: {student.admissionNo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Routine Badges */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0">
                    {dayLogs.length === 0 ? (
                      <span className="inline-flex items-center text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full font-normal border border-dashed">
                        Not Submitted
                      </span>
                    ) : (
                      dayLogs.map((log, idx) => {
                        const tasks = Object.values(log.tasks || {});
                        if (tasks.length === 0) return null;

                        const doneCount = tasks.filter((t: any) => t.status === "DONE").length;
                        const partialCount = tasks.filter((t: any) => t.status === "PARTIAL").length;
                        const score = doneCount + (partialCount * 0.5);
                        const percent = Math.round((score / tasks.length) * 100);

                        let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
                        if (percent < 50) {
                          badgeColor = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
                        } else if (percent < 80) {
                          badgeColor = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
                        }

                        const tplName = templates[log.templateId]?.name || "Routine";

                        return (
                          <button
                            key={log.id || idx}
                            type="button"
                            onClick={() => setSelectedLogDetail({ student, log, date: selectedDate })}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all active:scale-95 cursor-pointer shadow-2xs",
                              badgeColor
                            )}
                            title={`View ${tplName} report`}
                          >
                            <span className="font-normal opacity-85 max-w-[80px] sm:max-w-[120px] truncate">
                              {tplName}:
                            </span>
                            <span>{percent}%</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Routine Detail Dialog */}
      <Dialog open={!!selectedLogDetail} onOpenChange={(open) => !open && setSelectedLogDetail(null)}>
        <DialogContent className="max-w-md w-[92vw] sm:w-full p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="text-left pb-2 border-b">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                {selectedLogDetail?.student.name}
              </DialogTitle>
              {selectedLogDetail && (
                <Badge variant="outline" className="text-xs font-normal shrink-0">
                  {templates[selectedLogDetail.log.templateId]?.name || "Routine"}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {selectedLogDetail && format(selectedLogDetail.date, "EEEE, MMMM do, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedLogDetail && (() => {
            const log = selectedLogDetail.log;
            const template = templates[log.templateId];
            const tasks = Object.values(log.tasks || {});
            const doneCount = tasks.filter((t: any) => t.status === "DONE").length;
            const partialCount = tasks.filter((t: any) => t.status === "PARTIAL").length;
            const missedCount = tasks.filter((t: any) => t.status === "MISSED").length;
            const score = doneCount + (partialCount * 0.5);
            const percent = tasks.length > 0 ? Math.round((score / tasks.length) * 100) : 0;

            return (
              <div className="space-y-4 pt-2">
                {/* Score Summary Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Compliance Score
                    </div>
                    <div className="text-2xl font-bold mt-0.5 text-foreground">{percent}%</div>
                  </div>
                  <div className="flex flex-col items-end text-xs gap-0.5">
                    <span className="text-emerald-600 font-medium">✓ {doneCount} Completed</span>
                    {partialCount > 0 && <span className="text-amber-600 font-medium">⚠ {partialCount} Partial</span>}
                    {missedCount > 0 && <span className="text-rose-600 font-medium">✕ {missedCount} Missed</span>}
                  </div>
                </div>

                {/* Individual Tasks */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {!template ? (
                    <p className="text-sm text-muted-foreground">Template details unavailable.</p>
                  ) : (
                    template.tasks.map((task: any) => {
                      const taskLog = log.tasks?.[task.id];
                      if (!taskLog) return null;

                      let Icon = XCircle;
                      let iconColor = "text-rose-500";
                      let statusBadge = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
                      
                      if (taskLog.status === "DONE") {
                        Icon = CheckCircle2;
                        iconColor = "text-emerald-500";
                        statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
                      } else if (taskLog.status === "PARTIAL") {
                        Icon = AlertCircle;
                        iconColor = "text-amber-500";
                        statusBadge = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
                      }

                      return (
                        <div key={task.id} className="p-3 border rounded-lg bg-card/60 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                              <span className="text-sm font-medium truncate">{task.name}</span>
                            </div>
                            <Badge variant="outline" className={`text-[10px] uppercase font-semibold shrink-0 ${statusBadge}`}>
                              {taskLog.status}
                            </Badge>
                          </div>
                          {taskLog.note && (
                            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md italic ml-6 border">
                              "{taskLog.note}"
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

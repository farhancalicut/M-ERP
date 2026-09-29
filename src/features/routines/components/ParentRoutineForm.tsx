"use client";

import { useState, useEffect } from "react";
import { format, isSameDay, isBefore, startOfDay, parse } from "date-fns";
import { Student } from "@/features/students/types";
import { RoutineTemplate, DailyRoutineLog, RoutineTaskLog, RoutineTaskStatus } from "@/types/schema";
import { studentService } from "@/features/students/services/studentService";
import { routineService } from "@/features/routines/services/routineService";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function ParentRoutineForm() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [logs, setLogs] = useState<Record<string, DailyRoutineLog>>({});
  const [taskState, setTaskState] = useState<Record<string, RoutineTaskLog>>({});
  
  const [loading, setLoading] = useState(true);
  const [submittingTemplateId, setSubmittingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.madrassaId || !userData?.uid) return;
    
    const parentIdentifier = (userData as any).domainId || (userData as any).uid || userData.id;
    studentService.getStudentsByParent(userData.madrassaId, parentIdentifier).then(kids => {
      setChildren(kids);
      if (kids.length > 0) {
        if (kids[0]) setSelectedChild(kids[0].studentId);
      }
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load children");
      setLoading(false);
    });
  }, [userData]);

  useEffect(() => {
    if (!userData?.madrassaId || !selectedChild) return;
    
    const fetchTemplatesAndLogs = async () => {
      const child = children.find(c => c.studentId === selectedChild);
      if (!child || !child.classId) return;

      setLoading(true);
      try {
        const activeTpls = await routineService.getActiveTemplatesForClass(userData.madrassaId, child.classId);
        setTemplates(activeTpls);
        
        const dateStr = format(date, "yyyy-MM-dd");
        
        const fetchedLogs: Record<string, DailyRoutineLog> = {};
        const emptyTaskState: Record<string, RoutineTaskLog> = {};

        // Fetch logs for all active templates
        await Promise.all(
          activeTpls.map(async (tpl) => {
            const existingLog = await routineService.getDailyLogForStudent(selectedChild, tpl.id!, dateStr);
            if (existingLog) {
              fetchedLogs[tpl.id!] = existingLog;
              Object.assign(emptyTaskState, existingLog.tasks);
            } else {
              // Initialize empty state for this template
              tpl.tasks.forEach(t => {
                emptyTaskState[t.id] = { taskId: t.id, status: "MISSED" };
              });
            }
          })
        );
        
        setLogs(fetchedLogs);
        setTaskState(emptyTaskState);
      } catch (error) {
        toast.error("Failed to load routine data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplatesAndLogs();
  }, [userData?.madrassaId, selectedChild, date, children]);

  const handleStatusChange = (taskId: string, status: RoutineTaskStatus) => {
    setTaskState(prev => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || { taskId, status: 'PENDING' as any }), status }
    }));
  };

  const handleNoteChange = (taskId: string, note: string) => {
    setTaskState(prev => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || { taskId, status: 'PENDING' as any }), note }
    }));
  };

  const handleSubmit = async (template: RoutineTemplate) => {
    if (!userData?.madrassaId || !userData?.uid || !selectedChild) return;
    
    const child = children.find(c => c.studentId === selectedChild);
    if (!child || !child.classId || !currentAcademicYear?.id) return;

    setSubmittingTemplateId(template.id!);
    try {
      // Only submit tasks that belong to this template
      const templateTasksState: Record<string, RoutineTaskLog> = {};
      template.tasks.forEach(t => {
        const val = taskState[t.id];
        if (val) {
          templateTasksState[t.id] = val;
        }
      });

      await routineService.submitDailyLog(
        userData.madrassaId,
        currentAcademicYear.id,
        selectedChild,
        child.classId,
        template.id!,
        format(date, "yyyy-MM-dd"),
        templateTasksState,
        userData.uid
      );
      
      // Update local log state
      const dateStr = format(date, "yyyy-MM-dd");
      setLogs(prev => {
        const existing = prev[template.id!];
        const updatedLog: DailyRoutineLog = existing 
          ? { ...existing, submitted: true } 
          : {
              madrassaId: userData.madrassaId,
              academicYearId: currentAcademicYear.id,
              studentId: selectedChild,
              classId: child.classId,
              templateId: template.id!,
              date: dateStr,
              tasks: templateTasksState,
              submitted: true,
            };
        return {
          ...prev,
          [template.id!]: updatedLog
        };
      });
      
      toast.success(`${template.name} submitted successfully!`);
    } catch (error) {
      toast.error(`Failed to submit ${template.name}`);
    } finally {
      setSubmittingTemplateId(null);
    }
  };

  if (loading && children.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (children.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No enrolled children found.</div>;
  }

  const isToday = isSameDay(date, new Date());
  const isPast = isBefore(startOfDay(date), startOfDay(new Date()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm items-end">
        <div className="space-y-1 flex-1 w-full">
          <label className="text-sm font-medium">Select Child</label>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map(c => (
                <SelectItem key={c.studentId} value={c.studentId}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 w-full">
          <label className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{date ? format(date, "PPP") : "Pick a date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                disabled={(d) => d > new Date()} // Prevent selecting future dates
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!loading && templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active routines found for this student's class.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {templates.map(template => {
            const log = logs[template.id!];
            
            // Check cutoff time
            let isPastCutoff = false;
            if (isToday && template.cutoffTime) {
              const now = new Date();
              const cutoffDate = parse(template.cutoffTime, 'HH:mm', new Date());
              if (now > cutoffDate) {
                isPastCutoff = true;
              }
            }

            // Determine if form should be read-only
            const isReadOnly = (log?.submitted && !isToday) || isPast || isPastCutoff;

            // We removed category grouping, just render tasks directly
            const allTasks = template.tasks || [];

            return (
              <Card key={template.id} className="border-2 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
                  <div>
                    <CardTitle className="text-2xl text-primary">{template.name}</CardTitle>
                    {isReadOnly && (
                      <Badge variant="outline" className="mt-2 bg-muted text-muted-foreground">Read Only</Badge>
                    )}
                  </div>
                  {template.cutoffTime && (
                    <div className="flex items-center text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Cutoff: {template.cutoffTime}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-8 pt-6">
                  {isPastCutoff && !log?.submitted && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start">
                      <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Submission Closed</p>
                        <p className="text-sm">The cutoff time ({template.cutoffTime}) for today's routine has passed. You can no longer submit.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid gap-3">
                      {allTasks.map(task => {
                          const tState = taskState[task.id];
                          return (
                            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg hover:border-primary/20 transition-colors">
                              <div className="font-medium flex-1 text-lg">{task.name}</div>
                              
                              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                <div className="flex bg-muted/30 rounded-md border p-1 shadow-sm">
                                  <button
                                    disabled={isReadOnly}
                                    onClick={() => handleStatusChange(task.id, "DONE")}
                                    className={cn(
                                      "flex items-center px-4 py-2 rounded text-sm font-semibold transition-all",
                                      tState?.status === "DONE" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 shadow-sm" : "hover:bg-muted text-muted-foreground",
                                      isReadOnly && "opacity-70 cursor-not-allowed"
                                    )}
                                  >
                                    <CheckCircle2 className="w-5 h-5 mr-1.5" />
                                    Done
                                  </button>
                                  <button
                                    disabled={isReadOnly}
                                    onClick={() => handleStatusChange(task.id, "PARTIAL")}
                                    className={cn(
                                      "flex items-center px-4 py-2 rounded text-sm font-semibold transition-all",
                                      tState?.status === "PARTIAL" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow-sm" : "hover:bg-muted text-muted-foreground",
                                      isReadOnly && "opacity-70 cursor-not-allowed"
                                    )}
                                  >
                                    <AlertCircle className="w-5 h-5 mr-1.5" />
                                    Partial
                                  </button>
                                  <button
                                    disabled={isReadOnly}
                                    onClick={() => handleStatusChange(task.id, "MISSED")}
                                    className={cn(
                                      "flex items-center px-4 py-2 rounded text-sm font-semibold transition-all",
                                      tState?.status === "MISSED" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 shadow-sm" : "hover:bg-muted text-muted-foreground",
                                      isReadOnly && "opacity-70 cursor-not-allowed"
                                    )}
                                  >
                                    <XCircle className="w-5 h-5 mr-1.5" />
                                    Missed
                                  </button>
                                </div>
                                
                                <Input 
                                  placeholder="Add a note (optional)..." 
                                  className="w-full sm:w-[220px]"
                                  value={tState?.note || ""}
                                  onChange={(e) => handleNoteChange(task.id, e.target.value)}
                                  disabled={isReadOnly}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6 flex flex-col sm:flex-row justify-between items-center rounded-b-lg gap-4">
                  {log?.submitted ? (
                    <div className="text-green-600 font-medium flex items-center">
                      <CheckCircle2 className="w-6 h-6 mr-2" />
                      Routine Submitted
                    </div>
                  ) : isReadOnly ? (
                    <div className="text-muted-foreground font-medium flex items-center">
                      <Clock className="w-6 h-6 mr-2" />
                      Cannot submit (Read-only)
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      Ensure all tasks are marked correctly before submitting.
                    </div>
                  )}
                  
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto font-semibold px-8"
                    onClick={() => handleSubmit(template)} 
                    disabled={isReadOnly || submittingTemplateId === template.id! || isPastCutoff}
                  >
                    {submittingTemplateId === template.id! ? "Submitting..." : log?.submitted ? "Update Routine" : "Submit Routine"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

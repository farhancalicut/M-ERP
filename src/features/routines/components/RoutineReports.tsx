"use client";

import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { DailyRoutineLog, Class } from "@/types/schema";
import { routineService } from "@/features/routines/services/routineService";
import { classService } from "@/features/academic/services/classService";
import { studentService } from "@/features/students/services/studentService";
import { useAuthStore } from "@/stores/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Student } from "@/features/students/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function RoutineReports() {
  const { userData } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<DailyRoutineLog[]>([]);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<{ student: Student; log: DailyRoutineLog; date: Date } | null>(null);

  // Default to past 7 days
  const today = new Date();
  const startDate = subDays(today, 6);
  const dateRange = eachDayOfInterval({ start: startDate, end: today });

  useEffect(() => {
    if (!userData?.madrassaId) return;
    Promise.all([
      classService.getClasses(userData.madrassaId, "ALL"),
      routineService.getTemplates(userData.madrassaId)
    ]).then(([classRes, tplRes]) => {
      setClasses(classRes.classes);
      if (classRes.classes[0]) {
        setSelectedClass(classRes.classes[0].id!);
      }
      
      const tplMap: Record<string, any> = {};
      tplRes.forEach(t => { if (t.id) tplMap[t.id] = t; });
      setTemplates(tplMap);
      
      setLoading(false);
    });
  }, [userData?.madrassaId]);

  useEffect(() => {
    if (!userData?.madrassaId || !selectedClass) return;
    const fetchReportData = async () => {
      setFetchingReport(true);
      try {
        const [studentsRes, logsRes] = await Promise.all([
          studentService.searchStudents(userData.madrassaId, { classId: selectedClass }),
          routineService.getWeeklyCompliance(
            userData.madrassaId, 
            selectedClass, 
            format(startDate, "yyyy-MM-dd"), 
            format(today, "yyyy-MM-dd")
          )
        ]);
        setStudents(studentsRes.students);
        setLogs(logsRes);
      } catch (error) {
        toast.error("Failed to load reports");
      } finally {
        setFetchingReport(false);
      }
    };
    fetchReportData();
  }, [userData?.madrassaId, selectedClass]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-medium">Weekly Compliance Report</h3>
        <div className="w-full sm:w-[250px]">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Report: {format(startDate, "MMM dd")} - {format(today, "MMM dd, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fetchingReport ? (
            <div className="py-12 text-center text-muted-foreground">Generating report...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No students found in this class.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-muted/50">
                <span className="text-lg mr-2">💡</span>
                <strong>Tip:</strong> &nbsp;Click on any completion percentage below to view the detailed task statuses for that specific day.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium w-[200px]">Student Name</th>
                    {dateRange.map(date => (
                      <th key={date.toISOString()} className="p-3 text-center font-medium min-w-[100px]">
                        <div>{format(date, "EEE")}</div>
                        <div className="text-xs text-muted-foreground">{format(date, "MM/dd")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.studentId} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium truncate">{student.name}</td>
                      {dateRange.map(date => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const log = logs.find(l => l.studentId === student.studentId && l.date === dateStr);
                        
                        let display = <span className="text-muted-foreground">-</span>;
                        
                        if (log && log.submitted) {
                          // Calculate completion %
                          const tasks = Object.values(log.tasks);
                          if (tasks.length > 0) {
                            const doneCount = tasks.filter(t => t.status === "DONE").length;
                            const partialCount = tasks.filter(t => t.status === "PARTIAL").length;
                            // Let's say partial counts as half
                            const score = doneCount + (partialCount * 0.5);
                            const percent = Math.round((score / tasks.length) * 100);
                            
                            let color = "bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer";
                            if (percent >= 80) color = "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer";
                            else if (percent >= 50) color = "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer";
                            
                            display = (
                              <Badge 
                                variant="secondary" 
                                className={color}
                                onClick={() => setSelectedLogDetail({ student, log, date })}
                              >
                                {percent}%
                              </Badge>
                            );
                          }
                        }

                        return (
                          <td key={date.toISOString()} className="p-3 text-center">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLogDetail} onOpenChange={(open) => !open && setSelectedLogDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Routine Details</DialogTitle>
          </DialogHeader>
          
          {selectedLogDetail && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                <div>
                  <p className="font-medium">{selectedLogDetail.student.name}</p>
                  <p className="text-sm text-muted-foreground">{format(selectedLogDetail.date, "EEEE, MMMM do, yyyy")}</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {(() => {
                  const log = selectedLogDetail.log;
                  const template = templates[log.templateId];
                  if (!template) return <p className="text-muted-foreground text-sm">Template not found.</p>;
                  
                  return template.tasks.map((task: any) => {
                    const taskLog = log.tasks[task.id];
                    if (!taskLog) return null;
                    
                    let Icon = XCircle;
                    let iconColor = "text-red-500";
                    if (taskLog.status === "DONE") {
                      Icon = CheckCircle2;
                      iconColor = "text-green-500";
                    } else if (taskLog.status === "PARTIAL") {
                      Icon = AlertCircle;
                      iconColor = "text-amber-500";
                    }
                    
                    return (
                      <div key={task.id} className="flex flex-col gap-1.5 p-3 border rounded-md bg-card">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm flex items-center">
                            <Icon className={`w-4 h-4 mr-2 ${iconColor}`} />
                            {task.name}
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase">{taskLog.status}</Badge>
                        </div>
                        {taskLog.note && (
                          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded ml-6 italic">
                            "{taskLog.note}"
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

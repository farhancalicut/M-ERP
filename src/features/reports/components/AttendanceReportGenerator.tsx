"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { studentService } from "@/features/students/services/studentService";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { attendanceSettingsService } from "@/features/settings/services/attendanceSettingsService";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { Class } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Search, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { getDaysInMonth, format, differenceInDays, parseISO, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AttendanceRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  percent: number;
  days: Record<string, string>; // e.g. "2026-07-01": "P"
}

type ReportMode = "monthly" | "custom";
type FilterType = "ALL" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD" | "CRITICAL";

export function AttendanceReportGenerator() {
  const { userData, currentAcademicYear, isInitialized } = useAuthStore();
  const madrassaId = userData?.madrassaId;

  const [activeYearId, setActiveYearId] = useState<string | undefined>(currentAcademicYear?.id);

  useEffect(() => {
    if (currentAcademicYear) {
      setActiveYearId(currentAcademicYear.id);
    } else if (madrassaId) {
      academicYearService.getAcademicYears(madrassaId, "ACTIVE", undefined, 1).then(res => {
        if (res.years.length > 0) {
          setActiveYearId(res.years[0]!.id as string);
        }
      }).catch(console.error);
    }
  }, [currentAcademicYear, madrassaId]);

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [globalThreshold, setGlobalThreshold] = useState<number | null>(null);
  
  // Modes & Filters
  const [reportMode, setReportMode] = useState<ReportMode>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AttendanceRow[]>([]);
  const [daysInView, setDaysInView] = useState<Date[]>([]);
  
  useEffect(() => {
    if (!isInitialized || !madrassaId) return;

    const initData = async () => {
      try {
        const [classRes, settingsRes] = await Promise.all([
          classService.getClasses(madrassaId, "ALL", undefined, 100),
          attendanceSettingsService.getAttendanceSettings(madrassaId)
        ]);
        setClasses(classRes.classes);
        if (settingsRes?.attendanceAlertThreshold) {
          setGlobalThreshold(settingsRes.attendanceAlertThreshold);
        }
      } catch (error) {
        toast.error("Failed to load classes or settings");
      }
    };
    initData();
  }, [madrassaId, isInitialized]);

  const generateReport = async () => {
    if (!madrassaId || !activeYearId || !selectedClassId) return;

    // Validate Custom Range
    if (reportMode === "custom") {
      if (!startDate || !endDate) {
        return toast.error("Please select a valid start and end date.");
      }
      const diff = differenceInDays(parseISO(endDate), parseISO(startDate));
      if (diff < 0) {
        return toast.error("End date cannot be before start date.");
      }
      if (diff > 31) {
        return toast.error("Custom date range cannot exceed 31 days to maintain performance.");
      }
    }

    setLoading(true);
    try {
      // 1. Get students for this class
      const studentsRes = await studentService.searchStudents(madrassaId, { classId: selectedClassId, status: "ACTIVE" }, 100);
      const students = studentsRes.students;
      
      let attendanceList = [];
      let days: Date[] = [];

      // 2. Get attendance documents based on mode
      if (reportMode === "monthly") {
        const res = await attendanceService.listAttendance(
          madrassaId, 
          activeYearId, 
          selectedClassId, 
          selectedMonth, 
          selectedYear, 
          100 
        );
        attendanceList = res.attendanceList;
        const numDays = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));
        days = Array.from({ length: numDays }, (_, i) => new Date(selectedYear, selectedMonth - 1, i + 1));
      } else {
        const res = await attendanceService.listAttendanceByDateRange(
          madrassaId,
          activeYearId,
          selectedClassId,
          startDate,
          endDate
        );
        attendanceList = res.attendanceList;
        days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      }

      setDaysInView(days);

      // 3. Map data
      const rows: AttendanceRow[] = students.map((student: any) => {
        const row: AttendanceRow = {
          studentId: student.studentId,
          studentName: student.name,
          admissionNo: student.admissionNo || "-",
          totalPresent: 0,
          totalAbsent: 0,
          totalLeave: 0,
          percent: 0,
          days: {}
        };

        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const attDoc = attendanceList.find(a => a.date === dateStr);
          
          if (attDoc && (attDoc.status === "SUBMITTED" || attDoc.status === "LOCKED")) {
            const record = attDoc.attendance[student.studentId];
            if (record) {
              if (record.status === "PRESENT") { row.totalPresent++; row.days[dateStr] = "P"; }
              else if (record.status === "ABSENT") { row.totalAbsent++; row.days[dateStr] = "A"; }
              else if (record.status === "LEAVE") { row.totalLeave++; row.days[dateStr] = "L"; }
            } else {
              row.days[dateStr] = "-";
            }
          } else {
            row.days[dateStr] = "-";
          }
        });

        const totalDays = row.totalPresent + row.totalAbsent + row.totalLeave;
        row.percent = totalDays > 0 ? Math.round((row.totalPresent / totalDays) * 100) : 0;

        return row;
      });

      setReportData(rows);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const filteredReportData = useMemo(() => {
    let filtered = reportData;
    if (filterType === "ABOVE_THRESHOLD" && globalThreshold !== null) {
      filtered = filtered.filter(row => row.percent >= globalThreshold);
    } else if (filterType === "BELOW_THRESHOLD" && globalThreshold !== null) {
      filtered = filtered.filter(row => row.percent < globalThreshold);
    } else if (filterType === "CRITICAL") {
      filtered = filtered.filter(row => row.percent < 50);
    }
    return filtered;
  }, [reportData, filterType, globalThreshold]);

  const columns = useMemo(() => {
    const cols: ColumnDef<AttendanceRow>[] = [
      {
        accessorKey: "studentName",
        header: "Student Name",
        cell: ({ row }) => <div className="min-w-[150px] font-medium">{row.original.studentName}</div>
      },
      {
        accessorKey: "totalPresent",
        header: "P",
        cell: ({ row }) => <div className="text-green-600 font-bold text-center">{row.original.totalPresent}</div>
      },
      {
        accessorKey: "totalAbsent",
        header: "A",
        cell: ({ row }) => <div className="text-red-600 font-bold text-center">{row.original.totalAbsent}</div>
      },
      {
        accessorKey: "totalLeave",
        header: "L",
        cell: ({ row }) => <div className="text-yellow-600 font-bold text-center">{row.original.totalLeave}</div>
      },
      {
        accessorKey: "percent",
        header: "%",
        cell: ({ row }) => {
          const isDanger = globalThreshold !== null && row.original.percent < globalThreshold;
          return (
            <div className={`text-center font-bold px-2 py-0.5 rounded ${isDanger ? 'bg-red-100 text-red-700 border border-red-200' : 'text-primary'}`}>
              {row.original.percent}%
            </div>
          );
        }
      }
    ];

    daysInView.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      cols.push({
        id: dateStr,
        header: format(day, 'd'),
        cell: ({ row }) => {
          const status = row.original.days[dateStr];
          let colorClass = "text-muted-foreground";
          if (status === "P") colorClass = "text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded";
          if (status === "A") colorClass = "text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded";
          if (status === "L") colorClass = "text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded";
          return <div className={`text-center mx-auto w-6 text-xs ${colorClass}`}>{status}</div>;
        }
      });
    });

    return cols;
  }, [daysInView, globalThreshold]);

  const exportData = useMemo(() => {
    return filteredReportData.map(row => {
      const data: any = {
        'Student Name': row.studentName,
        'Register No': row.admissionNo,
        'Total Present': row.totalPresent,
        'Total Absent': row.totalAbsent,
        'Total Leave': row.totalLeave,
        'Attendance %': `${row.percent}%`
      };
      
      daysInView.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        data[format(day, 'MMM d')] = row.days[dateStr];
      });

      return data;
    });
  }, [filteredReportData, daysInView]);

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <CardTitle>Attendance Report Generator</CardTitle>
              <CardDescription>Generate customized attendance matrices and defaulter lists.</CardDescription>
            </div>
            <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)}>
              <TabsList>
                <TabsTrigger value="monthly">Month-Wise</TabsTrigger>
                <TabsTrigger value="custom">Custom Date Range</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Select Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id as string}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {reportMode === "monthly" ? (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-[100px] bg-background">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-[150px] bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">End Date</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="w-[150px] bg-background"
                  />
                </div>
              </>
            )}

            <Button 
              onClick={generateReport} 
              disabled={!selectedClassId || loading}
              className="mb-[1px]"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
              Generate Grid
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {reportData.length > 0 ? (
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/20 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Quick Filters</label>
                  <p className="text-xs text-muted-foreground">Filter the report to quickly identify students based on attendance performance.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={filterType === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("ALL")}
                  >
                    All Students
                  </Button>
                  <Button 
                    variant={filterType === "ABOVE_THRESHOLD" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("ABOVE_THRESHOLD")}
                  >
                    Good ({`>= ${globalThreshold ?? 75}%`})
                  </Button>
                  <Button 
                    variant={filterType === "BELOW_THRESHOLD" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("BELOW_THRESHOLD")}
                    className={filterType === "BELOW_THRESHOLD" ? "bg-amber-600 hover:bg-amber-700 text-white border-transparent" : "text-amber-700 border-amber-200 hover:bg-amber-50"}
                  >
                    Warning ({`< ${globalThreshold ?? 75}%`})
                  </Button>
                  <Button 
                    variant={filterType === "CRITICAL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("CRITICAL")}
                    className={filterType === "CRITICAL" ? "bg-red-600 hover:bg-red-700 text-white border-transparent" : "text-red-700 border-red-200 hover:bg-red-50"}
                  >
                    Critical ({`< 50%`})
                  </Button>
                </div>
              </div>

              {globalThreshold !== null && (
                <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-md p-3 flex items-center text-amber-800 dark:text-amber-300 text-sm mt-2">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                  Global Attendance Alert Threshold is set to <strong className="mx-1">{globalThreshold}%</strong> in Settings. Students below this threshold are highlighted.
                </div>
              )}

              <DataTable 
                columns={columns} 
                data={filteredReportData}
                searchKey="studentName"
                searchPlaceholder="Search by student name..."
                exportFilename={`Attendance_Report_${selectedClassId}_${reportMode}`}
                exportData={exportData}
              />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg border-dashed border-2 m-4">
              <Search className="h-8 w-8 mb-4 opacity-20" />
              <p>Select your criteria and click Generate to view the report.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { attendanceReportService } from "@/features/reports/services/attendanceReportService";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classService } from "@/features/academic/services/classService";
import { Class, Attendance } from "@/types/schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AttendanceReportsPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Attendance[]>([]);

  // Mandatory Filters
  const [classId, setClassId] = useState<string>("");
  const [month, setMonth] = useState<string>("");

  useEffect(() => {
    if (madrassaId) {
      classService.getClasses(madrassaId).then(res => setClasses(res.classes)).catch(console.error);
    }
  }, [madrassaId]);

  const handleGenerate = async () => {
    if (!madrassaId) return;
    if (!classId || !month) {
      toast.error("Please select a Class and Month");
      return;
    }
    
    try {
      setLoading(true);
      const res = await attendanceReportService.generateClassAttendanceReport(madrassaId, classId, month);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Date", dataKey: "date" },
    { header: "Student ID", dataKey: "studentId" },
    { header: "Status", dataKey: "status" },
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters (All Mandatory)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input 
              type="month" 
              className="w-[180px]" 
              value={month} 
              onChange={e => setMonth(e.target.value)} 
            />

            <Button onClick={handleGenerate} disabled={loading || !classId || !month}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Results</CardTitle>
          <ExportButtons data={data} columns={columns} filename="attendance_report" title="Attendance Report" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <ReportTable columns={columns} data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

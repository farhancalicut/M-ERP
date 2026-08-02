"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { examReportService } from "@/features/reports/services/examReportService";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classService } from "@/features/academic/services/classService";
import { examService } from "@/features/exams/services/examService";
import { Class, Exam, Result } from "@/types/schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ExamReportsPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Result[]>([]);

  // Mandatory Filters
  const [classId, setClassId] = useState<string>("");
  const [examId, setExamId] = useState<string>("");

  useEffect(() => {
    if (madrassaId && currentAcademicYear?.id) {
      classService.getClasses(madrassaId).then(res => setClasses(res.classes)).catch(console.error);
      examService.getExams(madrassaId, currentAcademicYear.id).then(res => setExams(res.exams)).catch(console.error);
    }
  }, [madrassaId, currentAcademicYear?.id]);

  const handleGenerate = async () => {
    if (!madrassaId) return;
    if (!classId || !examId) {
      toast.error("Please select a Class and an Exam");
      return;
    }
    
    try {
      setLoading(true);
      const res = await examReportService.generateExamReport(madrassaId, examId, classId);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Student ID", dataKey: "studentId" },
    { header: "Total Marks", dataKey: "totalMarks" },
    { header: "Percentage", dataKey: "percentage" },
    { header: "Grade", dataKey: "grade" },
    { header: "Result Status", dataKey: "resultStatus" },
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Examination Reports</h1>

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

            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id!} value={e.id!}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleGenerate} disabled={loading || !classId || !examId}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Results</CardTitle>
          <ExportButtons data={data} columns={columns} filename="exam_report" title="Examination Report" />
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

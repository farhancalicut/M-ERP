"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentReportService } from "@/features/reports/services/studentReportService";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classService } from "@/features/academic/services/classService";
import { Class, User } from "@/types/schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function StudentReportsPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<User[]>([]);

  // Filters
  const [classId, setClassId] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    if (madrassaId) {
      classService.getClasses(madrassaId).then(res => setClasses(res.classes)).catch(console.error);
    }
  }, [madrassaId]);

  const handleGenerate = async () => {
    if (!madrassaId) return;
    try {
      setLoading(true);
      const filters: { classId?: string; gender?: string; status?: string } = {};
      if (classId !== "all") filters.classId = classId;
      if (gender !== "all") filters.gender = gender;
      if (status !== "all") filters.status = status;
      const res = await studentReportService.generateStudentReport(madrassaId, filters);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Name", dataKey: "name" },
    { header: "Email", dataKey: "email" },
    { header: "Gender", dataKey: "gender" },
    { header: "Status", dataKey: "status" },
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Student Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Class (All)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Gender (All)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status (All)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Results</CardTitle>
          <ExportButtons data={data} columns={columns} filename="student_report" title="Student Report" />
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

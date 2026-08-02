"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { academicReportService } from "@/features/reports/services/academicReportService";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AcademicReportsPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ classes: any[], subjects: any[] }>({ classes: [], subjects: [] });

  const handleGenerate = async () => {
    if (!madrassaId || !currentAcademicYear?.id) {
      toast.error("Academic Year is missing.");
      return;
    }
    
    try {
      setLoading(true);
      const res = await academicReportService.generateAcademicReport(madrassaId);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const classColumns = [
    { header: "Name", dataKey: "name" },
    { header: "Max Students", dataKey: "capacity" },
    { header: "Status", dataKey: "status" },
  ];

  const subjectColumns = [
    { header: "Name", dataKey: "name" },
    { header: "Code", dataKey: "code" },
    { header: "Status", dataKey: "status" },
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Academic Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 items-center">
            <span className="text-sm font-medium">Academic Year: {currentAcademicYear?.name || "None"}</span>
            <Button onClick={handleGenerate} disabled={loading || !currentAcademicYear?.id}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.classes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Classes Summary</CardTitle>
            <ExportButtons data={data.classes} columns={classColumns} filename="academic_classes" title="Classes Report" />
          </CardHeader>
          <CardContent>
            <ReportTable columns={classColumns} data={data.classes} />
          </CardContent>
        </Card>
      )}

      {data.subjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subjects Summary</CardTitle>
            <ExportButtons data={data.subjects} columns={subjectColumns} filename="academic_subjects" title="Subjects Report" />
          </CardHeader>
          <CardContent>
            <ReportTable columns={subjectColumns} data={data.subjects} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

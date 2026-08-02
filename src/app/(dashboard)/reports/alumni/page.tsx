"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { alumniReportService } from "@/features/reports/services/alumniReportService";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/types/schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AlumniReportsPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<User[]>([]);

  // Mandatory Filter
  const [graduationYear, setGraduationYear] = useState<string>("");

  // Generate an array of years for the select dropdown (last 20 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(20), (val, index) => (currentYear - index).toString());

  const handleGenerate = async () => {
    if (!madrassaId) return;
    if (!graduationYear) {
      toast.error("Please select a Graduation Year");
      return;
    }
    
    try {
      setLoading(true);
      const res = await alumniReportService.generateAlumniReport(madrassaId, graduationYear);
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
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Alumni Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters (All Mandatory)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={graduationYear} onValueChange={setGraduationYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Graduation Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleGenerate} disabled={loading || !graduationYear}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Results</CardTitle>
          <ExportButtons data={data} columns={columns} filename="alumni_report" title={`Alumni Report - ${graduationYear}`} />
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

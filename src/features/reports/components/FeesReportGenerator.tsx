"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { feeReportService, EnrichedFeePayment } from "@/features/reports/services/feeReportService";
import { Class } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { ExportButtons } from "@/features/reports/components/ExportButtons";
import { Loader2, DollarSign, Activity, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/format";

export function FeesReportGenerator() {
  const { userData, currentAcademicYear, isInitialized } = useAuthStore();
  const madrassaId = userData?.madrassaId;

  // Filters
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ACTIVE");

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EnrichedFeePayment[]>([]);
  
  // Overview metrics
  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    totalTransactions: 0,
    failedTransactions: 0,
  });

  useEffect(() => {
    if (!isInitialized || !madrassaId) return;
    classService.getClasses(madrassaId, "ALL", undefined, 100)
      .then(res => setClasses(res.classes))
      .catch(() => toast.error("Failed to load classes"));
  }, [madrassaId, isInitialized]);

  const generateReport = async () => {
    if (!madrassaId || !currentAcademicYear?.id) {
      toast.error("Academic Year is missing.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select Start Date and End Date");
      return;
    }

    setLoading(true);
    try {
      const res = await feeReportService.generateFeeCollectionReport(madrassaId, {
        academicYearId: currentAcademicYear.id,
        startDate,
        endDate,
        classId: selectedClassId,
        paymentMethod: selectedMethod,
        status: selectedStatus,
      });

      setData(res);

      // Calculate metrics
      const totalCollected = res.filter(r => r.status === "ACTIVE").reduce((acc, curr) => acc + curr.amount, 0);
      const failedTransactions = res.filter(r => r.status === "VOID" || r.status === "REJECTED").length;
      setMetrics({
        totalCollected,
        totalTransactions: res.length,
        failedTransactions,
      });

    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Date", dataKey: "paymentDate", cell: (row: any) => row.paymentDate ? format(row.paymentDate.toDate(), 'PP') : "-" },
    { header: "Receipt No", dataKey: "receiptNo", cell: (row: any) => row.receiptNo || "-" },
    { header: "Student", dataKey: "studentName" },
    { header: "Class", dataKey: "className" },
    { header: "Category", dataKey: "categoryName" },
    { header: "Method", dataKey: "paymentMethod" },
    { header: "Amount", dataKey: "amount", cell: (row: any) => formatCurrency(row.amount) },
    { header: "Status", dataKey: "status" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fee Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm">Start Date *</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm">End Date *</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id as string}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm">Method</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active / Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <Button onClick={generateReport} disabled={loading || !startDate || !endDate} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on applied filters</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">Number of payment records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed / Rejected</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">Transactions not successful</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Results</CardTitle>
          <ExportButtons data={data} columns={columns} filename={`fees_report_${startDate}_to_${endDate}`} title="Fee Collection Report" />
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

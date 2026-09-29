"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { studentService } from "@/features/students/services/studentService";
import { classService } from "@/features/academic/services/classService";
import { exportUtils } from "@/lib/exportUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function DefaulterReportTab() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState("ALL");
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    loadData();
  }, [userData?.madrassaId, currentAcademicYear?.id]);

  const loadData = async () => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    try {
      setIsLoading(true);
      // 3 queries total: students, fees, classes
      const [{ students }, allFees, classRes] = await Promise.all([
        studentService.searchStudents(userData.madrassaId, { status: "ACTIVE" }, 5000),
        studentFeeService.getAllStudentFees(userData.madrassaId, currentAcademicYear.id),
        classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100),
      ]);

      setClasses(classRes.classes);

      const classMap = new Map(classRes.classes.map((c: any) => [c.id, c.name]));
      const feesMap = new Map(allFees.map(f => [f.studentId, f]));

      const result = students
        .map((s: any) => {
          const fee = feesMap.get(s.id);
          return {
            studentId: s.id,
            studentName: s.name,
            classId: s.classId,
            className: classMap.get(s.classId) || s.classId || "-",
            totalFee: fee?.totalAmount ?? 0,
            paidAmount: fee?.paidAmount ?? 0,
            dueAmount: fee?.dueAmount ?? 0,
            status: fee?.status ?? "NO_RECORD",
          };
        })
        .filter(d => d.dueAmount > 0)
        .sort((a, b) => b.dueAmount - a.dueAmount);

      setDefaulters(result);
    } catch {
      toast.error("Failed to load defaulter report");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return defaulters.filter(d => {
      const matchClass = classFilter === "ALL" || d.classId === classFilter;
      const matchSearch = !search || d.studentName.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [defaulters, classFilter, search]);

  const totalDue = filtered.reduce((sum, d) => sum + d.dueAmount, 0);

  const handleExport = async () => {
    const data = filtered.map(d => ({
      "Student Name": d.studentName,
      "Class": d.className,
      "Total Fee": d.totalFee,
      "Paid": d.paidAmount,
      "Due": d.dueAmount,
    }));
    await exportUtils.exportToCSV(data, `defaulters_${currentAcademicYear?.name || "report"}`);
    toast.success("Report exported");
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Fee Defaulter Report
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} students with outstanding dues for {currentAcademicYear?.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">Rs.{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Defaulters</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="sm:w-[220px]" />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center p-8 text-muted-foreground">No defaulters found.</TableCell></TableRow>
              ) : (
                filtered.map((d, i) => (
                  <TableRow key={d.studentId}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell className="font-medium">{d.studentName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.className}</TableCell>
                    <TableCell className="text-right text-sm">Rs.{d.totalFee.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right text-sm text-green-600">Rs.{d.paidAmount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">Rs.{d.dueAmount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={d.dueAmount > 5000 ? "destructive" : "outline"} className="text-xs">
                        {d.status === "PARTIAL" ? "Partial" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 && (
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={5} className="text-sm">Total Outstanding Dues</TableCell>
                  <TableCell className="text-right font-bold text-amber-600">Rs.{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
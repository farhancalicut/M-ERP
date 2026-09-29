"use client";

import { useState, useEffect } from "react";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { studentService } from "@/features/students/services/studentService";
import { classService } from "@/features/academic/services/classService";
import { StudentFeeSearchClient } from "@/features/fees/components/StudentFeeSearchClient";
import { useAuthStore } from "@/stores/authStore";
import { exportUtils } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, AlertTriangle, BookOpen } from "lucide-react";
import { toast } from "sonner";

export function FeeCollectionTab() {
  const { userData, currentAcademicYear } = useAuthStore();
  const isManagementOrPrincipal = userData?.role === "MANAGEMENT" || userData?.role === "PRINCIPAL";

  const [view, setView] = useState<"COLLECT" | "DEFAULTERS">("COLLECT");

  // Defaulters state (only loaded when tab is opened)
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);
  const [defaultersLoaded, setDefaultersLoaded] = useState(false);
  const [classFilter, setClassFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<any[]>([]);

  const loadDefaulters = async () => {
    if (!userData?.madrassaId || !currentAcademicYear?.id || defaultersLoaded) return;
    try {
      setDefaultersLoading(true);
      const [{ students }, allFees, classRes] = await Promise.all([
        studentService.searchStudents(userData.madrassaId, { status: "ACTIVE" }, 5000),
        studentFeeService.getAllStudentFees(userData.madrassaId, currentAcademicYear.id),
        classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100),
      ]);
      const classMap = new Map(classRes.classes.map((c: any) => [c.id, c.name]));
      setClasses(classRes.classes);
      const feesMap = new Map(allFees.map(f => [f.studentId, f]));
      const result = students
        .map((s: any) => ({
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          className: classMap.get(s.classId) || "—",
          dueAmount: feesMap.get(s.id)?.dueAmount ?? 0,
          paidAmount: feesMap.get(s.id)?.paidAmount ?? 0,
          totalFee: feesMap.get(s.id)?.totalAmount ?? 0,
        }))
        .filter(d => d.dueAmount > 0)
        .sort((a, b) => b.dueAmount - a.dueAmount);
      setDefaulters(result);
      setDefaultersLoaded(true);
    } catch {
      toast.error("Failed to load defaulters");
    } finally {
      setDefaultersLoading(false);
    }
  };

  const handleViewChange = (v: "COLLECT" | "DEFAULTERS") => {
    setView(v);
    if (v === "DEFAULTERS") loadDefaulters();
  };

  const filtered = defaulters.filter(d => {
    const matchClass = classFilter === "ALL" || d.classId === classFilter;
    const matchSearch = !search || d.studentName.toLowerCase().includes(search.toLowerCase());
    return matchClass && matchSearch;
  });
  const totalDue = filtered.reduce((s, d) => s + d.dueAmount, 0);

  return (
    <div className="space-y-4">
      {/* View toggle — only management/principal see Defaulters */}
      {isManagementOrPrincipal && (
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg w-fit">
          {[
            { id: "COLLECT", label: "Fee Collection", icon: BookOpen },
            { id: "DEFAULTERS", label: "Defaulters", icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleViewChange(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "DEFAULTERS" && defaulters.length > 0 && (
                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {defaulters.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fee Collection view */}
      {view === "COLLECT" && (
        <div className="animate-in fade-in duration-300">
          <StudentFeeSearchClient classes={[]} />
        </div>
      )}

      {/* Defaulters view */}
      {view === "DEFAULTERS" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {defaultersLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Outstanding Dues — {currentAcademicYear?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} students · Total Due:{" "}
                    <span className="font-bold text-amber-600">
                      Rs.{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline" size="sm"
                  disabled={filtered.length === 0}
                  onClick={async () => {
                    await exportUtils.exportToCSV(
                      filtered.map(d => ({
                        "Student": d.studentName, "Class": d.className,
                        "Total Fee": d.totalFee, "Paid": d.paidAmount, "Due": d.dueAmount,
                      })),
                      "defaulters"
                    );
                    toast.success("Exported");
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Search student..." value={search}
                  onChange={e => setSearch(e.target.value)} className="w-[200px]" />
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Classes</SelectItem>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
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
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                            No defaulters found. All students are up to date.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((d, i) => (
                          <TableRow key={d.studentId}>
                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell className="font-medium">{d.studentName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.className}</TableCell>
                            <TableCell className="text-right text-sm text-green-600">
                              Rs.{d.paidAmount.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600">
                              Rs.{d.dueAmount.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {filtered.length > 0 && (
                      <tfoot>
                        <TableRow className="bg-muted/50 border-t-2 font-semibold">
                          <TableCell colSpan={4} className="text-sm">Total Outstanding</TableCell>
                          <TableCell className="text-right font-bold text-amber-600">
                            Rs.{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    )}
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
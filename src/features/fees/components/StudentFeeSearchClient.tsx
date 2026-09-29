"use client";

import { useState, useEffect, useMemo } from "react";
import { FeeCategory, AssignedFee } from "@/types/schema";
import { Class } from "@/types/schema";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Search, CheckCircle2, AlertTriangle, Clock, Zap, BookOpen } from "lucide-react";
import { QuickCollectSheet } from "./QuickCollectSheet";
import { toast } from "sonner";

interface StudentFeeSearchClientProps {
  classes?: Class[]; // optional — loaded internally if not provided
}

// -----------------------------------------------
// Inline "Generate fees for this specific category"
// -----------------------------------------------
function GenerateFeeDialog({ category, madrassaId, academicYearId, onSuccess }: {
  category: FeeCategory;
  madrassaId: string;
  academicYearId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth().toString());
  const [loading, setLoading] = useState(false);
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentYear = new Date().getFullYear();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const count = await studentFeeService.generateMonthlyFees(
        madrassaId,
        academicYearId,
        null,
        category,
        parseInt(month) + 1,
        currentYear
      );
      if (count > 0) {
        toast.success(`Generated ${category.name} for ${count} students.`);
      } else {
        toast.info("Already generated or no active students found.");
      }
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate fees.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
        onClick={() => setOpen(true)}
      >
        <Zap className="h-3 w-3 mr-1" /> Generate
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Generate {category.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select the billing month to generate <strong>{category.name}</strong> for all active students.
            </p>
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {m} {currentYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted rounded-md p-2">
              Next billing: <span className="font-semibold text-foreground">
                {MONTHS[parseInt(month)]} {currentYear}
              </span> — click Generate to create fees for all active students.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -----------------------------------------------
// Compact class card used in both views
// -----------------------------------------------
function ClassCard({ cls, stats, amount, onClick }: {
  cls: Class;
  stats: { totalStudents: number; assignedCount: number; paid: number; due: number; total: number; rate: number };
  amount: number;
  onClick: () => void;
}) {
  const isComplete = stats.rate === 100 && stats.assignedCount > 0 && stats.assignedCount === stats.totalStudents;
  return (
    <button
      onClick={onClick}
      className="bg-card border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{cls.name}</p>
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : stats.due > 0 ? (
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        )}
      </div>
      {stats.assignedCount > 0 ? (
        <>
          <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
            <div
              className={`h-full rounded-full ${isComplete ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${stats.rate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.rate}% · {stats.assignedCount}/{stats.totalStudents} students
          </p>
          {stats.due > 0 && (
            <p className="text-xs font-semibold text-red-500 mt-0.5">
              Rs.{stats.due.toLocaleString("en-IN")} due
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{stats.totalStudents} students · Not yet charged</p>
      )}
    </button>
  );
}

// -----------------------------------------------
// Main component
// -----------------------------------------------
export function StudentFeeSearchClient({ classes: classesProp }: StudentFeeSearchClientProps) {
  const { userData, currentAcademicYear } = useAuthStore();
  const isManagementOrPrincipal = userData?.role === "MANAGEMENT" || userData?.role === "PRINCIPAL";

  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allStudentFees, setAllStudentFees] = useState<any[]>([]);
  const [loadedClasses, setLoadedClasses] = useState<Class[]>([]);

  // Navigation state
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Table state
  const [nameSearch, setNameSearch] = useState("");

  // Collect sheet
  const [collectTarget, setCollectTarget] = useState<{ student: any; assignedFee: AssignedFee } | null>(null);

  // Auto-assign state (for one-time fees)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Load all data once
  useEffect(() => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        setIsLoading(true);
        const [catRes, { students }, allFees, classRes] = await Promise.all([
          feeCategoryService.getFeeCategories(userData.madrassaId, { status: "ACTIVE" }, 100),
          studentService.searchStudents(userData.madrassaId, { status: "ACTIVE" }, 5000),
          studentFeeService.getAllStudentFees(userData.madrassaId, currentAcademicYear.id!),
          classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 200),
        ]);
        setFeeCategories(catRes.categories);
        setAllStudents(students);
        setAllStudentFees(allFees);
        // Use prop classes if provided, otherwise use fetched ones
        const cls = (classesProp && classesProp.length > 0) ? classesProp : classRes.classes;
        setLoadedClasses(cls);
      } catch {
        toast.error("Failed to load fee data.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userData?.madrassaId, currentAcademicYear?.id, refreshKey]);

  // Auto-assign one-time fees to all students in the class when the table view opens
  useEffect(() => {
    if (!selectedCategory || !selectedClass || selectedCategory.recurring) return;
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;

    const unassignedStudents = allStudents
      .filter(s => s.classId === selectedClass.id)
      .filter(s => {
        const fee = allStudentFees.find((f: any) => f.studentId === s.id as string);
        if (!fee) return true;
        return !(fee.assignedFees || []).some(
          (af: any) => af.feeCategoryId === selectedCategory.id && af.status !== "CANCELLED" && af.status !== "WAIVED"
        );
      });

    if (unassignedStudents.length === 0) return;

    const assign = async () => {
      try {
        setIsAutoAssigning(true);
        const ids = unassignedStudents.map(s => s.id as string);
        await studentFeeService.assignBulkFee(
          userData.madrassaId,
          currentAcademicYear.id!,
          ids,
          selectedCategory,
          selectedClass.id as string
        );
        refresh();
      } catch {
        toast.error("Failed to auto-assign fees to students.");
      } finally {
        setIsAutoAssigning(false);
      }
    };
    assign();
  }, [selectedCategory?.id, selectedClass?.id]);

  // Which classes apply to a fee category
  const getApplicableClasses = (cat: FeeCategory): Class[] => {
    if (cat.isClassWise && cat.classAmounts && Object.keys(cat.classAmounts).length > 0) {
      return loadedClasses.filter(c => (cat.classAmounts![c.id as string] ?? 0) > 0);
    }
    return loadedClasses;
  };

  // Per-class stats for a category
  const getCategoryClassStats = (cat: FeeCategory, cls: Class) => {
    const feesMap = new Map(allStudentFees.map(f => [f.studentId, f]));
    const studentsInClass = allStudents.filter(s => s.classId === cls.id);
    let assignedCount = 0, paid = 0, due = 0, total = 0;

    studentsInClass.forEach(s => {
      const fee = feesMap.get(s.id as string);
      if (!fee) return;
      const af = (fee.assignedFees || []).find(
        (af: any) => af.feeCategoryId === cat.id && af.status !== "CANCELLED" && af.status !== "WAIVED"
      );
      if (af) {
        assignedCount++;
        paid += af.paidAmount || 0;
        due += af.dueAmount || 0;
        total += af.amount || 0;
      }
    });

    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { totalStudents: studentsInClass.length, assignedCount, paid, due, total, rate };
  };

  // Fee amount for a class
  const getFeeAmount = (cat: FeeCategory, cls: Class) =>
    cat.isClassWise && cat.classAmounts?.[cls.id as string]
      ? cat.classAmounts[cls.id as string]!
      : cat.amount;

  // Students for table view (category × class)
  const tableData = useMemo(() => {
    if (!selectedCategory || !selectedClass) return [];
    const feesMap = new Map(allStudentFees.map(f => [f.studentId, f]));
    return allStudents
      .filter(s => s.classId === selectedClass.id)
      .map(s => {
        const fee = feesMap.get(s.id as string);
        const assignedFees: any[] = (fee?.assignedFees || []).filter(
          (af: any) => af.feeCategoryId === selectedCategory.id && af.status !== "CANCELLED" && af.status !== "WAIVED"
        );
        const assignedFee = assignedFees.length > 0
          ? assignedFees.sort((a: any, b: any) => (b.assignedAt?.toMillis?.() || 0) - (a.assignedAt?.toMillis?.() || 0))[0]
          : null;
        return { ...s, assignedFee };
      });
  }, [selectedCategory, selectedClass, allStudents, allStudentFees]);

  const filteredTable = useMemo(() => {
    if (!nameSearch.trim()) return tableData;
    const q = nameSearch.toLowerCase();
    return tableData.filter(s => s.name?.toLowerCase().includes(q) || s.admissionNo?.toLowerCase().includes(q));
  }, [tableData, nameSearch]);

  const statusBadge = (af: any) => {
    if (!af) return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">PENDING</Badge>;
    if (af.status === "PAID") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px] font-bold">PAID</Badge>;
    if (af.status === "WAIVED") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 text-[10px] font-bold">WAIVED</Badge>;
    if (af.status === "PARTIAL") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] font-bold">PARTIAL</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] font-bold">UNPAID</Badge>;
  };

  const refresh = () => setRefreshKey(k => k + 1);

  // ==========================
  // VIEW: STUDENT TABLE (fee × class)
  // ==========================
  if (selectedCategory && selectedClass) {
    const catAmount = getFeeAmount(selectedCategory, selectedClass);
    const tableStats = {
      paid: filteredTable.reduce((s, t) => s + (t.assignedFee?.paidAmount || 0), 0),
      due: filteredTable.reduce((s, t) => s + (t.assignedFee?.dueAmount || 0), 0),
      paidCount: filteredTable.filter(t => t.assignedFee?.status === "PAID").length,
      unpaidCount: filteredTable.filter(t => t.assignedFee && t.assignedFee.status !== "PAID" && t.assignedFee.status !== "WAIVED").length,
    };
    return (
      <div className="space-y-4 animate-in slide-in-from-right-3 duration-300">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button onClick={() => { setSelectedCategory(null); setSelectedClass(null); setNameSearch(""); }}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Fees
          </button>
          <span className="text-muted-foreground">/</span>
          <button onClick={() => { setSelectedClass(null); setNameSearch(""); }}
            className="text-muted-foreground hover:text-foreground font-medium transition-colors">
            {selectedCategory.name}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold text-foreground">{selectedClass.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">Rs.{catAmount.toLocaleString("en-IN")}/student</span>
        </div>

        {/* Auto-assign spinner */}
        {isAutoAssigning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Assigning fee to all students in this class...
          </div>
        )}

        {/* Mini stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Collected", value: `Rs.${tableStats.paid.toLocaleString("en-IN")}`, color: "text-green-600" },
            { label: "Outstanding", value: `Rs.${tableStats.due.toLocaleString("en-IN")}`, color: "text-red-600" },
            { label: "Fully Paid", value: `${tableStats.paidCount} / ${filteredTable.length}`, color: "" },
            { label: "Unpaid / Partial", value: tableStats.unpaidCount.toString(), color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or admission no..."
            value={nameSearch} onChange={e => setNameSearch(e.target.value)}
            className="pl-9 h-9 text-sm" />
        </div>

        {/* Student table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTable.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No students found.</TableCell>
                  </TableRow>
                ) : filteredTable.map(s => {
                  const af = s.assignedFee;
                  const isPaid = af?.status === "PAID";
                  return (
                    <TableRow key={s.id as string}>
                      <TableCell>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.admissionNo || "—"}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {af ? `Rs.${af.amount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600 font-medium">
                        {af ? `Rs.${af.paidAmount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold">
                        {af?.status === "PAID" ? <span className="text-green-500 font-semibold">✓ Cleared</span>
                          : af?.status === "WAIVED" ? <span className="text-purple-500 font-semibold">Waived</span>
                          : af ? <span className="text-red-600">Rs.{af.dueAmount.toLocaleString("en-IN")}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{statusBadge(af)}</TableCell>
                      <TableCell className="text-right">
                        {af && af.status !== "PAID" && af.status !== "WAIVED" && (
                          <Button size="sm" className="text-xs h-8"
                            onClick={() => setCollectTarget({ student: s, assignedFee: af })}>
                            Collect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {collectTarget && currentAcademicYear?.id && (
          <QuickCollectSheet
            isOpen={!!collectTarget}
            onClose={() => setCollectTarget(null)}
            student={collectTarget.student}
            category={selectedCategory}
            assignedFee={collectTarget.assignedFee}
            academicYearId={currentAcademicYear.id}
            madrassaId={userData?.madrassaId || ""}
            onSuccess={() => { setCollectTarget(null); refresh(); }}
          />
        )}
      </div>
    );
  }

  // ==========================
  // VIEW: FEE GRID (default — grouped by fee name)
  // ==========================
  const recurringCats = feeCategories.filter(c => c.recurring);
  const oneTimeCats = feeCategories.filter(c => !c.recurring);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (feeCategories.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No fee categories found.</p>
        <p className="text-sm mt-1">Go to <strong>Settings → Fee Management</strong> to create fee categories.</p>
      </div>
    );
  }

  const FeeSection = ({ categories, label, badgeLabel, badgeClass }: { categories: FeeCategory[]; label: string; badgeLabel: string; badgeClass: string; }) => {
    if (categories.length === 0) return null;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="font-bold text-sm text-foreground">{label}</h3>
          <Badge className={`border-0 text-[10px] ${badgeClass}`}>{badgeLabel}</Badge>
        </div>
        <div className="space-y-6">
          {categories.map(cat => {
            const applicable = getApplicableClasses(cat);
            return (
              <div key={cat.id as string} className="space-y-3">
                {/* Fee heading row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="font-semibold text-base hover:text-primary transition-colors text-left"
                    >
                      {cat.name}
                    </button>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cat.isClassWise ? "Class-wise pricing" : `Rs.${cat.amount.toLocaleString("en-IN")}/student`}
                      {applicable.length > 0 && ` · ${applicable.length} classes`}
                    </p>
                  </div>
                  {cat.recurring && isManagementOrPrincipal && currentAcademicYear?.id && (
                    <GenerateFeeDialog
                      category={cat}
                      madrassaId={userData?.madrassaId || ""}
                      academicYearId={currentAcademicYear.id}
                      onSuccess={refresh}
                    />
                  )}
                </div>

                {/* Class cards */}
                {applicable.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">
                    {cat.isClassWise
                      ? "No classes configured. Go to Settings → Fee Management to set class-wise amounts."
                      : "No classes found."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {applicable.map(cls => (
                      <ClassCard
                        key={cls.id as string}
                        cls={cls}
                        stats={getCategoryClassStats(cat, cls)}
                        amount={getFeeAmount(cat, cls)}
                        onClick={() => { setSelectedCategory(cat); setSelectedClass(cls); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <FeeSection
        categories={recurringCats}
        label="Recurring Fees"
        badgeLabel="Monthly / Periodic"
        badgeClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      />
      <FeeSection
        categories={oneTimeCats}
        label="One-Time Fees"
        badgeLabel="Book Fee, Exam Fee, etc."
        badgeClass="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      />
    </div>
  );
}
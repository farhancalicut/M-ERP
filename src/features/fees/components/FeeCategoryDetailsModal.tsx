"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search, FileText, Download } from "lucide-react";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { FeeCategory, Student, StudentFee } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FeeCategoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: FeeCategory | null;
  classes: { id: string; name: string }[];
  madrassaId: string;
  academicYearId: string;
}

interface StudentDetailRow {
  student: Student;
  feeAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}

export function FeeCategoryDetailsModal({
  isOpen,
  onClose,
  category,
  classes,
  madrassaId,
  academicYearId
}: FeeCategoryDetailsModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<StudentDetailRow[]>([]);

  useEffect(() => {
    if (isOpen && category) {
      fetchDetails();
    }
  }, [isOpen, category, selectedClassId]);

  const fetchDetails = async () => {
    if (!category) return;
    try {
      setIsLoading(true);
      
      const searchFilters: any = { status: "ACTIVE" };
      if (selectedClassId !== "ALL") searchFilters.classId = selectedClassId;
      
      const { students } = await studentService.searchStudents(madrassaId, searchFilters, 1000);
      
      const feesDataList = await Promise.all(
        students.map((s: any) => studentFeeService.getStudentFees(s.id as string, academicYearId))
      );
      
      const detailedRows: StudentDetailRow[] = [];
      
      students.forEach((student: any, idx) => {
        const feeSummary = feesDataList[idx];
        
        let feeAmount = category.amount;
        if (category.isClassWise && category.classAmounts?.[student.classId]) {
          feeAmount = category.classAmounts[student.classId] || category.amount;
        }

        let paidAmount = 0;
        let dueAmount = feeAmount; // default due if not assigned yet
        let status = "UNASSIGNED";
        let isAssigned = false;

        if (feeSummary && feeSummary.assignedFees) {
          // Find all assignments of this fee category for this student
          const matchingFees = feeSummary.assignedFees.filter(f => f.feeCategoryId === category.id);
          if (matchingFees.length > 0) {
            isAssigned = true;
            paidAmount = matchingFees.reduce((acc, curr) => acc + curr.paidAmount, 0);
            dueAmount = matchingFees.reduce((acc, curr) => acc + curr.dueAmount, 0);
            feeAmount = matchingFees.reduce((acc, curr) => acc + curr.amount, 0);
            
            if (dueAmount === 0 && feeAmount > 0) status = "PAID";
            else if (paidAmount > 0) status = "PARTIAL";
            else status = "UNPAID";
          }
        }

        detailedRows.push({
          student,
          feeAmount,
          paidAmount,
          dueAmount,
          status
        });
      });
      
      setRows(detailedRows);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to load category details");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter(r => 
      r.student.name.toLowerCase().includes(search.toLowerCase()) || 
      (r.student.studentId && r.student.studentId.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let pending = 0;
    rows.forEach(r => {
      // If UNASSIGNED, it is technically not pending yet in the system, but we might consider it as expected revenue.
      // Usually, expected is the assigned amount. Let's only count assigned fees for accurate collection stats.
      if (r.status !== "UNASSIGNED") {
        totalExpected += r.feeAmount;
        totalCollected += r.paidAmount;
        pending += r.dueAmount;
      }
    });
    const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    return { totalExpected, totalCollected, pending, rate };
  }, [rows]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 bg-slate-50 h-[85vh] max-h-[800px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{category?.name} Analytics</h2>
              <p className="text-sm text-slate-500">Detailed collection breakdown per student.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="bg-white">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">TOTAL EXPECTED</p>
                <h3 className="text-2xl font-bold text-slate-900">₹ {stats.totalExpected.toLocaleString()}</h3>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">TOTAL COLLECTED</p>
                <h3 className="text-2xl font-bold text-teal-700">₹ {stats.totalCollected.toLocaleString()}</h3>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">PENDING (ASSIGNED)</p>
                <h3 className="text-2xl font-bold text-red-600">₹ {stats.pending.toLocaleString()}</h3>
              </CardContent>
            </Card>

            <Card className="bg-teal-800 text-white border-none shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-medium text-teal-200 uppercase tracking-wider mb-2">COLLECTION RATE</p>
                <h3 className="text-2xl font-bold text-white">{stats.rate}%</h3>
              </CardContent>
            </Card>
          </div>

          {/* Details Table */}
          <Card className="bg-white border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-slate-800">Student Breakdown</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-9 h-9 w-[250px] bg-slate-50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
                </div>
              ) : (
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 backdrop-blur z-10 shadow-sm border-b">
                    <tr>
                      <th className="px-5 py-3">STUDENT NAME</th>
                      <th className="px-5 py-3">CLASS</th>
                      <th className="px-5 py-3 text-right">ASSIGNED</th>
                      <th className="px-5 py-3 text-right">PAID</th>
                      <th className="px-5 py-3 text-right">BALANCE</th>
                      <th className="px-5 py-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((row, idx) => {
                      const initials = row.student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const isTeal = idx % 2 === 0;
                      return (
                        <tr key={row.student.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className={`h-8 w-8 ${isTeal ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                <AvatarFallback className="font-bold text-[10px] bg-transparent">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-xs">{row.student.name}</span>
                                <span className="text-xs text-slate-500 font-medium">#{row.student.studentId || "No ADM"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600 font-medium">
                            {classes.find(c => c.id === row.student.classId)?.name || "-"}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-slate-800">
                            {row.status !== "UNASSIGNED" ? `₹${row.feeAmount.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-teal-700">
                            {row.status !== "UNASSIGNED" ? `₹${row.paidAmount.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-red-600">
                            {row.status !== "UNASSIGNED" && row.dueAmount > 0 ? `₹${row.dueAmount.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {row.status === "PAID" && <Badge variant="outline" className="bg-green-100/50 text-green-700 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">PAID</Badge>}
                            {row.status === "PARTIAL" && <Badge variant="outline" className="bg-yellow-100/50 text-yellow-700 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">PARTIAL</Badge>}
                            {row.status === "UNPAID" && <Badge variant="outline" className="bg-red-100/50 text-red-700 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">UNPAID</Badge>}
                            {row.status === "UNASSIGNED" && <Badge variant="outline" className="bg-slate-100 text-slate-500 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">UNASSIGNED</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No students found matching your criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}

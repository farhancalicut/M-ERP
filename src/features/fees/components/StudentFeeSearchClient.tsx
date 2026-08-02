"use client";

import { useState, useEffect, useMemo } from "react";
import { Class, Student, StudentFee, FeePayment, FeeCategory } from "@/types/schema";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { useAuthStore } from "@/stores/authStore";
import { exportUtils } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Download, Bell, FileText, TrendingUp, AlertTriangle, Users, Building, ArrowLeft, MoreHorizontal } from "lucide-react";
import { GenerateTuitionModal } from "./GenerateTuitionModal";
import { FeeCategoryDetailsModal } from "./FeeCategoryDetailsModal";
import { RecordPaymentSheet } from "./RecordPaymentSheet";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface StudentFeeSearchClientProps {
  classes: Class[];
}

export function StudentFeeSearchClient({ classes }: StudentFeeSearchClientProps) {
  const { userData, currentAcademicYear } = useAuthStore();
  
  // Dual-View Architecture State
  const [viewMode, setViewMode] = useState<"HUB" | "TABLE">("HUB");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // ==========================================
  // HUB MODE STATE & LOGIC
  // ==========================================
  const [hubData, setHubData] = useState<any>(null);
  const [allStudentsData, setAllStudentsData] = useState<any[]>([]);
  const [allStudentFeesData, setAllStudentFeesData] = useState<(StudentFee|null)[]>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [recentTransactions, setRecentTransactions] = useState<FeePayment[]>([]);
  const [otherCategories, setOtherCategories] = useState<FeeCategory[]>([]);
  const [selectedCategoryForDetails, setSelectedCategoryForDetails] = useState<FeeCategory | null>(null);
  const [isHubLoading, setIsHubLoading] = useState(true);

  useEffect(() => {
    if (viewMode !== "HUB" || !userData?.madrassaId || !currentAcademicYear?.id) return;
    
    let isMounted = true;
    const loadHubData = async () => {
      try {
        setIsHubLoading(true);
        // 1. Fetch Global Students and Categories
        const [{ students: allStudents }, feesResponse] = await Promise.all([
          studentService.searchStudents(userData.madrassaId, { status: "ACTIVE" }, 5000),
          feeCategoryService.getFeeCategories(userData.madrassaId, { status: "ACTIVE" }, 100)
        ]);
        
        const nonRecurringCategories = feesResponse.categories.filter(c => c.recurring === false);

        // 2. Fetch Global Fees in Chunks (Mocking global aggregation for performance)
        const classIds = classes.map(c => c.id as string);
        const feesDataList = await Promise.all(
          allStudents.map((s: any) => studentFeeService.getStudentFees(s.id as string, currentAcademicYear.id as string))
        );

        let totalRevenue = 0;
        let totalPaid = 0;
        let pendingDues = 0;
        
        const categoryStats: Record<string, { total: number; paid: number }> = {};

        feesDataList.forEach((feeSummary: StudentFee | null, idx) => {
          if (!feeSummary) return;
          
          totalRevenue += feeSummary.totalAmount;
          totalPaid += feeSummary.paidAmount;
          pendingDues += feeSummary.dueAmount;

          feeSummary.assignedFees?.forEach(af => {
            if (!categoryStats[af.feeName]) categoryStats[af.feeName] = { total: 0, paid: 0 };
            categoryStats[af.feeName]!.total += af.amount;
            categoryStats[af.feeName]!.paid += af.paidAmount;
          });
        });

        // 3. Fetch Recent Transactions
        const txRes = await paymentService.getPayments(userData.madrassaId, undefined, 3);

        if (isMounted) {
          setAllStudentsData(allStudents);
          setAllStudentFeesData(feesDataList);
          
          setHubData({
            totalRevenue,
            pendingDues,
            collectionRate: totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0,
            activeStudents: allStudents.length,
            categoryStats
          });
          setRecentTransactions(txRes.payments);
          setOtherCategories(nonRecurringCategories);
        }
      } catch (error) {
        console.error("Hub Load Error", error);
      } finally {
        if (isMounted) setIsHubLoading(false);
      }
    };

    loadHubData();
    return () => { isMounted = false; };
  }, [viewMode, userData, currentAcademicYear, classes]);

  const monthlyClassStats = useMemo(() => {
    const stats: Record<string, { total: number; paid: number; className: string }> = {};
    classes.forEach(c => {
      stats[c.id as string] = { total: 0, paid: 0, className: c.name };
    });
    
    allStudentFeesData.forEach((feeSummary, idx) => {
      if (!feeSummary) return;
      const student = allStudentsData[idx];
      if (!student?.classId || !stats[student.classId]) return;
      
      feeSummary.assignedFees?.forEach(af => {
        if (af.month === selectedMonthIndex) {
          stats[student.classId]!.total += af.amount;
          stats[student.classId]!.paid += af.paidAmount;
        }
      });
    });
    
    return Object.values(stats).filter(s => s.total >= 0); // Keep all classes even if 0 for visibility
  }, [allStudentsData, allStudentFeesData, classes, selectedMonthIndex]);


  // ==========================================
  // TABLE MODE STATE & LOGIC
  // ==========================================
  const [tableStudents, setTableStudents] = useState<any[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "PAID" | "UNPAID" | "PARTIAL">("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadTableData = async (cls: Class) => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    try {
      setIsTableLoading(true);
      const filters: Record<string, string> = { status: "ACTIVE", classId: cls.id as string };
      const { students: foundStudents }: any = await studentService.searchStudents(userData.madrassaId, filters, 1000);
      
      const studentFeesList = await Promise.all(
        foundStudents.map((s: any) => studentFeeService.getStudentFees(s.id as string, currentAcademicYear.id as string))
      );

      const studentsWithFees = foundStudents.map((student: any, i: number) => ({
        ...student,
        feeSummary: studentFeesList[i]
      }));

      setTableStudents(studentsWithFees);
    } catch (error: any) {
      toast.error(error.message || "Failed to load class table");
    } finally {
      setIsTableLoading(false);
    }
  };

  const handleDrillDown = (cls: Class) => {
    setSelectedClass(cls);
    setViewMode("TABLE");
    loadTableData(cls);
  };

  const displayedStudents = useMemo(() => {
    let filtered = tableStudents;
    if (nameSearch) {
      filtered = filtered.filter((s: any) => 
        s.name.toLowerCase().includes(nameSearch.toLowerCase()) || 
        (s.admissionNo && s.admissionNo.toLowerCase().includes(nameSearch.toLowerCase()))
      );
    }
    if (filterTab === "ALL") return filtered;
    return filtered.filter((s: any) => {
      const status = s.feeSummary?.status || "PENDING";
      if (filterTab === "PAID") return status === "PAID";
      if (filterTab === "PARTIAL") return status === "PARTIAL";
      if (filterTab === "UNPAID") return status === "PENDING" || status === "UNPAID";
      return true;
    });
  }, [tableStudents, filterTab, nameSearch]);

  const tableAnalytics = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;
    let fullPaidCount = 0;
    let unpaidCount = 0;
    tableStudents.forEach((s: any) => {
      if (s.feeSummary) {
        totalDue += s.feeSummary.dueAmount || 0;
        totalPaid += s.feeSummary.paidAmount || 0;
        if (s.feeSummary.status === "PAID") fullPaidCount++;
        if (s.feeSummary.status === "PENDING" || s.feeSummary.status === "PARTIAL" || s.feeSummary.status === "UNPAID") {
          unpaidCount++;
        }
      } else {
        unpaidCount++;
      }
    });
    
    const collectionRate = totalPaid + totalDue > 0 ? Math.round((totalPaid / (totalPaid + totalDue)) * 100) : 0;
    
    return { totalDue, totalPaid, fullPaidCount, unpaidCount, collectionRate, count: tableStudents.length };
  }, [tableStudents]);

  const columns: ColumnDef<unknown>[] = [
    {
      accessorKey: "admissionNo",
      header: "ADM NO",
      cell: ({ row }) => <div className="text-teal-700 dark:text-teal-400 font-semibold text-sm">{row.getValue("admissionNo") || "-"}</div>
    },
    {
      accessorKey: "name",
      header: "STUDENT NAME",
      cell: ({ row }) => {
        const name = String(row.getValue("name"));
        const parentId = (row.original as any).parentId;
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const isTeal = name.length % 2 === 0;
        
        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar className={`h-9 w-9 ${isTeal ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>
              <AvatarFallback className="font-bold text-xs bg-transparent">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">{name}</span>
              <span className="text-xs text-muted-foreground mt-0.5">Guardian: {parentId || "Unknown"}</span>
            </div>
          </div>
        );
      }
    },
    {
      id: "tuitionFee",
      header: "TUITION FEE (₹)",
      cell: ({ row }) => {
        const feeSummary = (row.original as any).feeSummary as StudentFee | undefined;
        return <div className="font-medium text-foreground">{feeSummary ? feeSummary.totalAmount.toLocaleString() : "-"}</div>;
      }
    },
    {
      id: "paid",
      header: "PAID (₹)",
      cell: ({ row }) => {
        const feeSummary = (row.original as any).feeSummary as StudentFee | undefined;
        return <div className="font-medium text-foreground">{feeSummary ? feeSummary.paidAmount.toLocaleString() : "-"}</div>;
      }
    },
    {
      id: "balance",
      header: "BALANCE (₹)",
      cell: ({ row }) => {
        const feeSummary = (row.original as any).feeSummary as StudentFee | undefined;
        if (!feeSummary || feeSummary.dueAmount === 0) return <div className="font-medium text-foreground">0</div>;
        return <div className="font-bold text-red-600 dark:text-red-400">{feeSummary.dueAmount.toLocaleString()}</div>;
      }
    },
    {
      id: "status",
      header: "STATUS",
      cell: ({ row }) => {
        const feeSummary = (row.original as any).feeSummary as StudentFee | undefined;
        const status = feeSummary?.status || "PENDING";
        
        if (status === "PAID") return <Badge variant="outline" className="bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">PAID</Badge>;
        if (status === "PARTIAL") return <Badge variant="outline" className="bg-yellow-100/50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">PARTIAL</Badge>;
        return <Badge variant="outline" className="bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">UNPAID</Badge>;
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right">ACTION</div>,
      cell: ({ row }) => {
        const feeSummary = (row.original as any).feeSummary as StudentFee | undefined;
        const status = feeSummary?.status || "PENDING";
        
        return (
          <div className="flex justify-end gap-2 items-center">
            {status !== "PAID" && (
              <Button onClick={() => toast.success("Reminder sent to parent.")} size="sm" variant="outline" className="h-8 text-teal-800 border-teal-200 hover:bg-teal-50 dark:bg-teal-900/20 text-xs px-3 shadow-none rounded-md font-semibold">
                <Bell className="w-3.5 h-3.5 mr-1.5" /> REMIND
              </Button>
            )}
            <Button 
              onClick={() => setSelectedStudentId((row.original as any).id)} 
              variant="default" 
              size="sm"
              className="h-8 bg-teal-800 dark:bg-teal-600 hover:bg-teal-900 text-white rounded-md font-semibold shadow-none text-xs"
            >
              RECORD PAYMENT
            </Button>
          </div>
        );
      }
    }
  ];

  // ==========================================
  // RENDER: FINANCIAL MANAGEMENT HUB
  // ==========================================
  if (viewMode === "HUB") {
    if (isHubLoading) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-700 dark:text-teal-400" />
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">TOTAL REVENUE</p>
              <div className="flex justify-between items-end">
                <h3 className="text-3xl font-bold text-foreground">₹ {(hubData?.totalRevenue || 0).toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">PENDING DUES</p>
              <div className="flex justify-between items-end">
                <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">₹ {(hubData?.pendingDues || 0).toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">COLLECTION RATE</p>
              <div className="flex justify-between items-end">
                <h3 className="text-3xl font-bold text-[#b38b36]">{hubData?.collectionRate || 0}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">ACTIVE STUDENTS</p>
              <div className="flex justify-between items-end">
                <h3 className="text-3xl font-bold text-foreground">{hubData?.activeStudents?.toLocaleString() || 0}</h3>
                <Users className="w-5 h-5 text-muted-foreground/70" />
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-medium">Total active students in Madrassa</p>
            </CardContent>
          </Card>
        </div>

        {/* Dual Layout for Monthly Progress & Generation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class Monthly Stats (Left 2/3 or Full if Teacher) */}
          <div className={`space-y-4 ${userData?.role === 'TEACHER' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-bold text-foreground">Monthly Tuition Status</h2>
              <Select 
                value={selectedMonthIndex.toString()} 
                onValueChange={(val) => setSelectedMonthIndex(parseInt(val))}
              >
                <SelectTrigger className="w-[160px] h-8 text-sm text-teal-700 dark:text-teal-400 font-semibold border-none shadow-none bg-transparent hover:bg-muted/30 focus:ring-0">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Horizontal Scroll / Grid for Classes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {classes.map((cls, idx) => {
                const stat = monthlyClassStats.find((c: any) => c.className === cls.name);
                const rate = stat && stat.total > 0 ? Math.round((stat.paid / stat.total) * 100) : 0;
                const due = stat ? (stat.total - stat.paid) : 0;
                
                // Color coding based on completion status
                const isComplete = rate === 100 && !!(stat && stat.total > 0);
                const colorClass = isComplete 
                  ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20' 
                  : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
                const barColor = isComplete ? 'bg-teal-700' : 'bg-red-600';
                
                return (
                  <Card key={cls.id as string} className="bg-card shadow-sm border rounded-xl hover:border-teal-200 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-lg text-foreground">{cls.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${colorClass}`}>
                          {rate}% Paid
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground mb-2">
                        Due Amount: ₹{due.toLocaleString()}
                      </p>
                      <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden mb-6">
                        <div className={`h-full ${barColor}`} style={{ width: `${rate}%` }} />
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDrillDown(cls)}
                        className="w-full text-teal-700 dark:text-teal-400 font-semibold border-teal-100 dark:border-teal-900 hover:bg-teal-50 dark:bg-teal-900/20"
                      >
                        View Students
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Fee Generation Block (Right 1/3) - Hidden for Teachers */}
          {userData?.role !== 'TEACHER' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Fee Generation</h2>
              <Card className="bg-teal-800 dark:bg-teal-600 text-white border-none shadow-md h-fit flex flex-col relative overflow-hidden">
                <div className="absolute right-[-30px] top-[-30px] w-48 h-48 bg-card/10 rounded-full blur-xl" />
                <CardContent className="p-6 flex flex-col relative z-10">
                  <p className="text-[10px] font-bold text-teal-100 uppercase tracking-wider mb-1">NEXT BILLING CYCLE</p>
                  <h3 className="text-3xl font-bold text-white mb-6">
                    {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                  </h3>
                  
                  <div className="bg-teal-900/50 p-4 rounded-lg flex gap-3 text-sm font-medium text-teal-50 mb-auto border border-teal-700/50">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-teal-300" />
                    <p>Automation will trigger generation for all class tuition fees.</p>
                  </div>
                  
                  <div className="mt-6">
                    {classes.length > 0 && (
                      <GenerateTuitionModal
                        madrassaId={userData?.madrassaId || ""}
                        classId="ALL"
                        className="All Active Classes"
                        academicYearId={currentAcademicYear?.id || ""}
                        academicYearName={currentAcademicYear?.name || ""}
                        onSuccess={() => window.location.reload()}
                      />
                    )}
                    <p className="text-center text-xs text-teal-200 mt-3 font-medium">Verify fee categories before generation</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>

        {/* Bottom Section: Categories & Transactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Other Fee Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {otherCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No other fee categories configured.</p>
            ) : (
              otherCategories.map((cat, idx) => {
                const stat = hubData?.categoryStats?.[cat.name];
                const rate = stat && stat.total > 0 ? Math.round((stat.paid / stat.total) * 100) : 0;
                
                const icons = [FileText, TrendingUp, Building, Users];
                const Icon = icons[idx % icons.length] as any;
                const isFirst = idx === 0;
                
                return (
                  <Card key={cat.id} className={`border shadow-sm rounded-xl ${isFirst ? 'bg-muted/30 border-border' : 'bg-card'}`}>
                    <CardContent className="p-5">
                      <div className="flex gap-4 items-start">
                        <div className={`p-2 rounded-lg border ${isFirst ? 'bg-card' : 'bg-muted/30'}`}>
                          <Icon className={`w-5 h-5 ${isFirst ? 'text-teal-700 dark:text-teal-400' : 'text-[#b38b36]'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-2">
                            <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                            <span className="text-xs font-bold text-muted-foreground">{rate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mb-3">
                            <div className={`h-full ${isFirst ? 'bg-teal-700' : 'bg-[#b38b36]'}`} style={{ width: `${rate}%` }} />
                          </div>
                          <div 
                            onClick={() => setSelectedCategoryForDetails(cat)}
                            className="flex items-center text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:text-teal-300 cursor-pointer"
                          >
                            View Details <span className="ml-1">›</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          
          {/* Chart Placeholder (Left 1/3) */}
          <Card className="bg-card border shadow-sm rounded-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">COLLECTION VS DUES</h3>
                <span className="text-xs text-muted-foreground/70 font-medium">Current Month</span>
              </div>
              <div className="flex justify-between items-end h-40 gap-3 relative overflow-x-auto pb-2 custom-scrollbar">
                {(monthlyClassStats || []).map((stat: any, i: number) => {
                  const paidPercentage = stat.total > 0 ? (stat.paid / stat.total) * 100 : 0;
                  const duePercentage = 100 - paidPercentage;
                  const shortName = stat.className.length > 8 ? stat.className.substring(0, 6) + ".." : stat.className;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full gap-1 group relative min-w-[50px]">
                      <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-t-sm transition-all" style={{ height: `${duePercentage}%` }} />
                      <div className="w-full bg-teal-800 dark:bg-teal-600 rounded-b-sm transition-all" style={{ height: `${paidPercentage}%` }} />
                      
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 transition-opacity">
                        <p className="font-bold">{stat.className}</p>
                        <p>Total: ₹{stat.total.toLocaleString()}</p>
                        <p className="text-teal-300">Paid: ₹{stat.paid.toLocaleString()}</p>
                        <p className="text-red-300">Due: ₹{(stat.total - stat.paid).toLocaleString()}</p>
                      </div>

                      <p className="text-[10px] text-center text-muted-foreground/80 font-semibold mt-2 truncate w-full" title={stat.className}>
                        {shortName}
                      </p>
                    </div>
                  );
                })}
                {(!monthlyClassStats || monthlyClassStats.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    No class data available
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-6">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-teal-800 dark:bg-teal-600" /><span className="text-xs text-muted-foreground">Collected</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" /><span className="text-xs text-muted-foreground">Due</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions (Right 2/3) */}
          <Card className="lg:col-span-2 bg-card border shadow-sm rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">RECENT TRANSACTIONS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-card text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">STUDENT NAME</th>
                  <th className="px-6 py-4">CLASS</th>
                  <th className="px-6 py-4">FEE TYPE</th>
                  <th className="px-6 py-4">AMOUNT</th>
                  <th className="px-6 py-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx, idx) => {
                  const matchingStudent = tableStudents.find((s:any) => s.id === tx.studentId);
                  const name = matchingStudent?.name || `Student (${tx.studentId.substring(0, 4)})`;
                  const initials = name.substring(0, 2).toUpperCase();
                  const className = matchingStudent ? classes.find(c => c.id === matchingStudent.classId)?.name || "Class" : "Global";
                  
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30/50">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted/50 text-slate-600 flex items-center justify-center text-xs font-bold">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{name}</span>
                          <span className="text-[10px] text-muted-foreground">#{tx.paymentNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{className}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">General Fee</td>
                      <td className="px-6 py-4 font-bold text-foreground">₹{tx.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-none font-bold text-[10px] tracking-wider px-2 py-0.5">PAID</Badge>
                      </td>
                    </tr>
                  )
                })}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No recent transactions.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </Card>
        </div>

        {selectedCategoryForDetails && (
          <FeeCategoryDetailsModal 
            isOpen={!!selectedCategoryForDetails}
            onClose={() => setSelectedCategoryForDetails(null)}
            category={selectedCategoryForDetails}
            classes={classes as any}
            madrassaId={userData?.madrassaId || ""}
            academicYearId={(currentAcademicYear?.id as string) || ""}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: TABLE MODE (Image 1)
  // ==========================================
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => setViewMode("HUB")}
        className="mb-[-1rem] text-muted-foreground hover:text-foreground font-semibold pl-0"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
      </Button>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {selectedClass?.name || "Class"} Student Fee Status
          </h1>
          <p className="text-teal-700 dark:text-teal-400 font-semibold mt-1 text-sm">{new Date().toLocaleString('default', { month: 'long' })} {currentAcademicYear?.name || ""}</p>
          <p className="text-muted-foreground mt-1 text-sm">Manage and monitor student tuition payments for the current month.</p>
        </div>
      </div>

      {/* Analytics Overview - 4 Cards */}
      {!isTableLoading && tableStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2">
          
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">TOTAL COLLECTION</p>
              <h3 className="text-2xl font-bold text-foreground">₹ {tableAnalytics.totalPaid.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-[11px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1.5" />
                {tableAnalytics.collectionRate}% Collected
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">PENDING DUES</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">₹ {tableAnalytics.totalDue.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-[11px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 w-fit px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                {tableAnalytics.unpaidCount} students unpaid
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">PAID FULL</p>
              <h3 className="text-2xl font-bold text-foreground">{tableAnalytics.fullPaidCount}</h3>
              <div className="flex items-center mt-2 text-xs font-semibold text-muted-foreground">
                Out of {tableAnalytics.count} students
              </div>
            </CardContent>
          </Card>

          <Card className="bg-teal-800 dark:bg-teal-600 text-white border-none shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <p className="text-[10px] font-bold text-teal-100 uppercase tracking-wider">QUICK ACTION</p>
              <Button 
                onClick={() => exportUtils.exportToCSV(displayedStudents, `${selectedClass?.name || 'Class'}_Report`)}
                className="w-full bg-card text-teal-900 dark:text-teal-300 hover:bg-muted/50 font-bold mt-4 h-10 shadow-sm"
              >
                Download Class Report
              </Button>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Main Container */}
      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        
        {/* Top Bar inside Container */}
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b">
          
          <div className="flex items-center bg-muted/30 p-1 rounded-full border border-border/50 overflow-x-auto whitespace-nowrap w-full sm:w-auto custom-scrollbar">
            {[
              { id: "ALL", label: "All Students" },
              { id: "PAID", label: "Paid" },
              { id: "UNPAID", label: "Unpaid" },
              { id: "PARTIAL", label: "Partial" }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  filterTab === tab.id 
                    ? "bg-teal-800 dark:bg-teal-600 text-white shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input 
              placeholder="Search by name or admission no..." 
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className="pl-9 bg-card border-border h-10"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="p-0 overflow-x-auto">
          {isTableLoading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
          ) : (
             <DataTable columns={columns} data={displayedStudents} />
          )}
        </div>

        {/* Footer of Container */}
        {!isTableLoading && (
          <div className="p-4 border-t flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-muted-foreground bg-muted/30/50">
            <div className="text-center sm:text-left">Showing 1 to {displayedStudents.length} of {tableStudents.length} students.</div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground/70 border-border bg-card">«</Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground/70 border-border bg-card">‹</Button>
              <div className="px-3 text-foreground font-medium">Page 1 of 1</div>
              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground/70 border-border bg-card">›</Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground/70 border-border bg-card">»</Button>
            </div>
          </div>
        )}
      </div>


      {selectedStudentId && currentAcademicYear?.id && (
        <RecordPaymentSheet
          isOpen={!!selectedStudentId}
          onClose={() => { setSelectedStudentId(null); loadTableData(selectedClass!); }}
          studentId={selectedStudentId}
          academicYearId={currentAcademicYear.id}
        />
      )}
    </div>
  );
}

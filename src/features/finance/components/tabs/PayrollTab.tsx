"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { staffService } from "@/features/staff/services/staffService";
import { salaryService } from "@/features/finance/services/salaryService";
import { User, SalaryPayment } from "@/types/schema";
import { toast } from "sonner";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils/format";
import { CheckCircle2, Ban, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProcessSalaryModal } from "@/features/finance/components/ProcessSalaryModal";

export function PayrollTab() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [staff, setStaff] = useState<User[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  // Derive year from the globally selected academic year
  const selectedYear = useMemo(() => {
    if (!currentAcademicYear?.name) return new Date().getFullYear();
    const match = currentAcademicYear.name.match(/\d{4}/);
    return match ? parseInt(match[0]) : new Date().getFullYear();
  }, [currentAcademicYear]);

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" },
    { value: "3", label: "March" }, { value: "4", label: "April" },
    { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" },
    { value: "9", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" }
  ];
  
  useEffect(() => {
    if (userData?.madrassaId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffMembers, salaryPayments] = await Promise.all([
        staffService.getStaffMembers(userData!.madrassaId),
        salaryService.getSalaryPayments(userData!.madrassaId, {
          month: parseInt(selectedMonth),
          year: selectedYear
        })
      ]);
      setStaff(staffMembers);
      setPayments(salaryPayments);
    } catch (error) {
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (paymentId: string) => {
    if (!confirm("Are you sure you want to void this salary payment?")) return;
    try {
      await salaryService.voidSalaryPayment(paymentId);
      toast.success("Salary payment voided");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const enrichedStaff = useMemo(() => {
    return staff.map(user => {
      const payment = payments.find(p => p.userId === (user.uid || user.id) && p.status === "PAID");
      return {
        ...user,
        paymentStatus: payment ? "PAID" : "PENDING",
        netPaid: payment ? payment.netPaid : 0,
        paymentId: payment?.id
      };
    });
  }, [staff, payments]);

  const totalPaid = enrichedStaff.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + s.netPaid, 0);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "displayName",
      header: "Employee Name",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
          {row.getValue("role")}
        </span>
      )
    },
    {
      accessorKey: "paymentStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string;
        if (status === "PAID") return <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">PAID</Badge>;
        return <Badge variant="secondary">PENDING</Badge>;
      }
    },
    {
      accessorKey: "netPaid",
      header: "Amount Paid",
      cell: ({ row }) => {
        const amt = row.getValue("netPaid") as number;
        return <div className="font-medium text-emerald-600">{amt > 0 ? formatCurrency(amt) : "-"}</div>;
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const s = row.original;
        
        return (
          <div className="flex justify-end">
            {s.paymentStatus === "PAID" ? (
              <Button variant="outline" size="sm" onClick={() => handleVoid(s.paymentId)} className="text-red-500 hover:text-red-600 transition-colors bg-red-500/10 border-red-500/20 hover:bg-red-500/20">
                <Ban className="w-4 h-4 mr-2" /> Void
              </Button>
            ) : (
              <ProcessSalaryModal
                madrassaId={s.madrassaId}
                userId={s.uid || s.id}
                userName={s.displayName}
                month={parseInt(selectedMonth)}
                year={selectedYear}
                onSuccess={fetchData}
              />
            )}
          </div>
        );
      }
    }
  ];

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "SUPER_ADMIN"]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mr-auto">Select Payroll Period:</div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md hover:shadow-lg transition-all border border-border/50 rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Paid This Month</CardTitle>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full shadow-sm ring-1 ring-emerald-500/20">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-black text-foreground">{formatCurrency(totalPaid)}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-all border border-border/50 rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processed Salaries</CardTitle>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full shadow-sm ring-1 ring-blue-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-black text-foreground">
                {enrichedStaff.filter(s => s.paymentStatus === "PAID").length} / {enrichedStaff.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Staff Payroll - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse">Loading payroll data...</div>
            ) : (
              <DataTable columns={columns} data={enrichedStaff} />
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}

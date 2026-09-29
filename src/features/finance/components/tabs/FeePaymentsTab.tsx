"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { paymentService } from "@/features/fees/services/paymentService";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { FeePayment } from "@/types/schema";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Ban, DollarSign, Activity, AlertCircle, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { exportUtils } from "@/lib/exportUtils";
import { ReceiptModal } from "@/features/fees/components/ReceiptModal";

export function FeePaymentsTab() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, currentAcademicYear?.id]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      paymentService.getPayments(userData!.madrassaId, {}, 100),
      feeCategoryService.getFeeCategories(userData!.madrassaId, {}, 100)
    ]).then(([paymentsRes, categoriesRes]) => {
      const catMap: Record<string, string> = {
        "ADMISSION_FEE_GEN": "Admission Fee",
        "EXPENSE": "Expense",
        "DONATION": "Donation",
      };
      categoriesRes.categories.forEach(c => {
        catMap[c.id!] = c.name;
      });
      setCategoriesMap(catMap);
      setPayments(paymentsRes.payments);
      setLoading(false);
    });
  };

  const handleVoidPayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to VOID this payment? This will roll back the student's fee balances.")) return;
    try {
      await paymentService.deletePayment(paymentId);
      toast.success("Payment voided successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to void payment");
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "transactionType",
      header: "Type",
      cell: ({ row }) => {
        const type = (row.original as any).transactionType || "FEE";
        const color = type === "EXPENSE" ? "destructive" : type === "DONATION" ? "rose" : "default";
        const label = type === "EXPENSE" ? "Expense" : type === "DONATION" ? "Donation" : "Fee";
        return <Badge variant={color as any} className={type === "DONATION" ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400" : ""}>{label}</Badge>;
      }
    },
    {
      accessorKey: "paymentNo",
      header: "Receipt No",
      cell: ({ row }) => <div className="font-medium">{row.getValue("paymentNo")}</div>
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }) => {
        const date: any = row.getValue("paymentDate");
        return <div>{date ? format((date as any).toDate(), "dd MMM yyyy") : "-"}</div>;
      }
    },
    {
      accessorKey: "studentId",
      header: "Student ID",
    },
    {
      accessorKey: "feeCategoryId",
      header: "Category / Description",
      cell: ({ row }) => {
        const type = (row.original as any).transactionType;
        if (type === "EXPENSE" || type === "DONATION") {
          return <div className="text-muted-foreground text-sm">{(row.original as any).remarks || "-"}</div>;
        }
        return <div>{categoriesMap[row.getValue("feeCategoryId") as string] || "Unknown"}</div>;
      }
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <div className="text-green-600 font-medium">₹{row.getValue("amount")}</div>
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("paymentMethod")}</Badge>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={(status === "ACTIVE" ? "success" : "destructive") as any}>
            {status}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const payment = row.original;
        const isVoided = payment.status === "VOID" || payment.status === "REJECTED";
        const isNonFee = (payment as any).transactionType === "EXPENSE" || (payment as any).transactionType === "DONATION";
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedReceipt(payment)}>
                <Printer className="mr-2 h-4 w-4" /> View Receipt
              </DropdownMenuItem>
              {!isNonFee && (
                <DropdownMenuItem 
                  onClick={() => handleVoidPayment(payment.id)}
                  disabled={isVoided}
                  className="text-red-600 focus:text-red-700"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Void Payment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  const handleExport = async () => {
    const data = filteredPayments.map(p => ({
      "Receipt No": p.paymentNo,
      "Date": typeof (p.paymentDate as any)?.toDate === 'function' ? format((p.paymentDate as any).toDate(), "dd MMM yyyy") : "-",
      "Type": (p as any).transactionType || "FEE",
      "Student ID": p.studentId,
      "Category": categoriesMap[p.feeCategoryId] || p.feeCategoryId,
      "Amount": p.amount,
      "Method": p.paymentMethod,
      "Status": p.status,
      "Remarks": p.remarks || "",
    }));
    await exportUtils.exportToCSV(data, "payment_history");
    toast.success("Payment history exported");
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
      const pType = (p as any).transactionType || "FEE";
      const matchType = filterType === "ALL" || pType === filterType;
      const matchSearch = searchTerm === "" || p.paymentNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchType && matchSearch;
    });
  }, [payments, filterStatus, filterType, searchTerm]);

  if (loading) return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading payment history...</div>;

  const feePayments = payments.filter(p => !((p as any).transactionType) || (p as any).transactionType === "FEE");
  const recentCollected = feePayments.filter(p => p.status === "ACTIVE").reduce((sum, p) => sum + p.amount, 0);
  const recentVoided = feePayments.filter(p => p.status === "VOID" || p.status === "REJECTED").length;

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-all border border-border/50 rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Collected</CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full shadow-sm ring-1 ring-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-foreground">{formatCurrency(recentCollected)}</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Sum of active payments</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-all border border-border/50 rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Transactions</CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full shadow-sm ring-1 ring-blue-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-foreground">{payments.length}</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Total receipts generated</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all border border-border/50 rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Voided</CardTitle>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-full shadow-sm ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-foreground">{recentVoided}</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Transactions marked as void</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <CardTitle className="text-xl">Payment History</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredPayments.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Input 
              placeholder="Search Receipt No..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-[200px]"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="FEE">Fee Payments</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
                <SelectItem value="DONATION">Donations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredPayments} />
        </CardContent>
      </Card>
    </div>

    <ReceiptModal
      payment={selectedReceipt}
      onClose={() => setSelectedReceipt(null)}
    />
  </>);
}

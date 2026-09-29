"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { paymentService } from "@/features/fees/services/paymentService";
import { expenseService } from "@/features/finance/services/expenseService";
import { donationService } from "@/features/finance/services/donationService";
import { exportUtils } from "@/lib/exportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Download, Heart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MonthlyStat {
  month: string;
  income: number;
  expenses: number;
  donations: number;
  net: number;
}

export function FinanceSummaryTab() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!userData?.madrassaId) return;
    loadData();
  }, [userData?.madrassaId]);

  const loadData = async () => {
    if (!userData?.madrassaId) return;
    try {
      setIsLoading(true);
      const [paymentsRes, expenses, donations] = await Promise.all([
        paymentService.getPayments(userData.madrassaId, {}, 500),
        expenseService.getExpensesByMadrassa(userData.madrassaId),
        donationService.getDonationsByMadrassa(userData.madrassaId),
      ]);

      const feePayments = paymentsRes.payments.filter(
        p => p.status === "ACTIVE" && (!(p as any).transactionType || (p as any).transactionType === "FEE")
      );

      const income = feePayments.reduce((s, p) => s + p.amount, 0);
      const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
      const donTotal = donations.reduce((s, d) => s + d.amount, 0);

      setTotalIncome(income);
      setTotalExpenses(expTotal);
      setTotalDonations(donTotal);
      setRecentPayments(feePayments.slice(0, 8));

      // Build last 6 months trend
      const months: MonthlyStat[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { month: format(d, "MMM yyyy"), income: 0, expenses: 0, donations: 0, net: 0 };
      });

      const monthKey = (date: Date) => format(date, "MMM yyyy");

      feePayments.forEach(p => {
        const mk = monthKey(p.paymentDate.toDate());
        const m = months.find(mo => mo.month === mk);
        if (m) m.income += p.amount;
      });
      expenses.forEach(e => {
        const mk = monthKey(e.date.toDate());
        const m = months.find(mo => mo.month === mk);
        if (m) m.expenses += e.amount;
      });
      donations.forEach(d => {
        const mk = monthKey(d.date.toDate());
        const m = months.find(mo => mo.month === mk);
        if (m) m.donations += d.amount;
      });
      months.forEach(m => { m.net = m.income + m.donations - m.expenses; });

      setMonthlyStats(months);
    } catch {
      toast.error("Failed to load financial summary");
    } finally {
      setIsLoading(false);
    }
  };

  const netBalance = totalIncome + totalDonations - totalExpenses;

  const handleExport = async () => {
    await exportUtils.exportToCSV(
      monthlyStats.map(m => ({
        "Month": m.month,
        "Fee Income (Rs.)": m.income,
        "Donations (Rs.)": m.donations,
        "Expenses (Rs.)": m.expenses,
        "Net (Rs.)": m.net,
      })),
      "financial_summary"
    );
    toast.success("Summary exported");
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.income + m.donations, m.expenses)), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Financial Summary</h2>
          <p className="text-sm text-muted-foreground">Overview of all income, donations, and expenses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Income</p>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">Rs.{totalIncome.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-rose-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Donations</p>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">Rs.{totalDonations.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expenses</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">Rs.{totalExpenses.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${netBalance >= 0 ? "border-teal-300 bg-teal-50/50 dark:bg-teal-500/10" : "border-red-300 bg-red-50/50 dark:bg-red-500/10"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Balance</p>
            </div>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-teal-700 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}>
              {netBalance >= 0 ? "+" : ""}Rs.{netBalance.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Bar Chart (CSS-only) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Last 6 Months Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-48 mt-2">
            {monthlyStats.map((m) => {
              const incH = Math.round(((m.income + m.donations) / maxVal) * 180);
              const expH = Math.round((m.expenses / maxVal) * 180);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: "180px" }}>
                    <div
                      title={`Income+Donations: Rs.${(m.income + m.donations).toLocaleString()}`}
                      className="flex-1 bg-teal-500/80 dark:bg-teal-600/80 rounded-t transition-all duration-500"
                      style={{ height: `${incH}px`, minHeight: incH > 0 ? "4px" : "0px" }}
                    />
                    <div
                      title={`Expenses: Rs.${m.expenses.toLocaleString()}`}
                      className="flex-1 bg-red-400/80 dark:bg-red-500/80 rounded-t transition-all duration-500"
                      style={{ height: `${expH}px`, minHeight: expH > 0 ? "4px" : "0px" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-teal-500/80" /> Income + Donations
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-red-400/80" /> Expenses
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Month</th>
                <th className="text-right p-3 font-semibold text-green-700">Fee Income</th>
                <th className="text-right p-3 font-semibold text-rose-600">Donations</th>
                <th className="text-right p-3 font-semibold text-red-600">Expenses</th>
                <th className="text-right p-3 font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(m => (
                <tr key={m.month} className="border-b hover:bg-muted/20">
                  <td className="p-3 font-medium">{m.month}</td>
                  <td className="p-3 text-right text-green-700">Rs.{m.income.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-rose-600">Rs.{m.donations.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-red-600">Rs.{m.expenses.toLocaleString("en-IN")}</td>
                  <td className={`p-3 text-right font-bold ${m.net >= 0 ? "text-teal-700 dark:text-teal-400" : "text-red-600"}`}>
                    {m.net >= 0 ? "+" : ""}Rs.{m.net.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Fee Collections</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Receipt</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Method</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{p.paymentNo}</td>
                    <td className="p-3">{p.paymentDate?.toDate ? format(p.paymentDate.toDate(), "dd MMM yyyy") : "-"}</td>
                    <td className="p-3 text-muted-foreground">{p.paymentMethod?.replace("_", " ")}</td>
                    <td className="p-3 text-right font-semibold text-green-700">Rs.{p.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
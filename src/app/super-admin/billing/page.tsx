"use client";

import { useEffect, useState } from "react";
import { billingService } from "@/features/super-admin/services/billingService";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, PlatformInvoice } from "@/types/schema";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Plus, CheckCircle2, Clock, XCircle, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { GenerateInvoiceDialog } from "@/features/super-admin/components/GenerateInvoiceDialog";
import { RecordPaymentDialog } from "@/features/super-admin/components/RecordPaymentDialog";

export default function BillingPage() {
  const { userData } = useAuthStore();
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<PlatformInvoice[]>([]);
  const [madrassas, setMadrassas] = useState<Madrassa[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<PlatformInvoice | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [invoicesData, madrassasData] = await Promise.all([
          billingService.getAllInvoices(),
          madrassaService.getAllMadrassas(),
        ]);
        setInvoices(invoicesData);
        setFilteredInvoices(invoicesData);
        setMadrassas(madrassasData);
      } catch (error) {
        console.error("Failed to load billing data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredInvoices(invoices);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredInvoices(
        invoices.filter((inv) => {
          const m = madrassas.find((m) => m.id === inv.madrassaId);
          return (
            inv.invoiceNumber.toLowerCase().includes(query) ||
            inv.billingPeriod.toLowerCase().includes(query) ||
            m?.name.toLowerCase().includes(query) ||
            m?.code.toLowerCase().includes(query)
          );
        })
      );
    }
  }, [searchQuery, invoices, madrassas]);

  const handleInvoiceGenerated = (newInvoice: PlatformInvoice) => {
    setInvoices([newInvoice, ...invoices]);
  };

  const handlePaymentRecorded = (updatedInvoice: PlatformInvoice) => {
    setInvoices(invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "OVERDUE":
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
          <p className="text-muted-foreground mt-1">
            Platform billing, invoices, and payment tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsGenerateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Madrassa</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount (₹)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p>No invoices found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const m = madrassas.find(m => m.id === inv.madrassaId);
                  return (
                    <tr key={inv.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{m?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{m?.code}</p>
                      </td>
                      <td className="px-4 py-3">{inv.billingPeriod}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.dueDate ? format((inv.dueDate as any).toDate(), "MMM dd, yyyy") : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-right">
                        {inv.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(inv.status)}
                          <span className={`text-xs font-medium ${
                            inv.status === "PAID" ? "text-green-700" :
                            inv.status === "PENDING" ? "text-blue-700" :
                            inv.status === "OVERDUE" ? "text-orange-700" : "text-red-700"
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === "PENDING" || inv.status === "OVERDUE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                            onClick={() => setPayingInvoice(inv)}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Record Payment
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {inv.status === "PAID" ? `Paid on ${format((inv.paidAt as any)?.toDate(), "MMM dd, yyyy")}` : "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GenerateInvoiceDialog
        madrassas={madrassas}
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onSuccess={handleInvoiceGenerated}
        currentUserId={userData?.id || ""}
      />

      <RecordPaymentDialog
        invoice={payingInvoice}
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onSuccess={handlePaymentRecorded}
        currentUserId={userData?.id || ""}
      />
    </div>
  );
}

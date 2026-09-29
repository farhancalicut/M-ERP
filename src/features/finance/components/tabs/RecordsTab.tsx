"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { expenseService } from "@/features/finance/services/expenseService";
import { donationService } from "@/features/finance/services/donationService";
import { Expense, Donation } from "@/types/schema";
import { exportUtils } from "@/lib/exportUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wallet, Heart, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Section = "EXPENSES" | "DONATIONS";

export function RecordsTab() {
  const { userData } = useAuthStore();
  const [section, setSection] = useState<Section>("EXPENSES");

  // ---- Expenses ----
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expLoading, setExpLoading] = useState(true);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const loadExpenses = async () => {
    if (!userData?.madrassaId) return;
    setExpLoading(true);
    try { setExpenses(await expenseService.getExpensesByMadrassa(userData.madrassaId)); }
    catch { toast.error("Failed to load expenses"); }
    finally { setExpLoading(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expDesc) { toast.error("Please fill all fields"); return; }
    try {
      setExpSubmitting(true);
      await expenseService.createExpense(userData!.madrassaId, parseFloat(expAmount), expDesc, userData!.uid);
      toast.success("Expense recorded");
      setExpAmount(""); setExpDesc(""); setExpDialogOpen(false);
      loadExpenses();
    } catch { toast.error("Failed to record expense"); }
    finally { setExpSubmitting(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try { await expenseService.deleteExpense(id); toast.success("Deleted"); loadExpenses(); }
    catch { toast.error("Failed to delete expense"); }
  };

  // ---- Donations ----
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donLoading, setDonLoading] = useState(true);
  const [donDialogOpen, setDonDialogOpen] = useState(false);
  const [donSubmitting, setDonSubmitting] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorContact, setDonorContact] = useState("");
  const [purpose, setPurpose] = useState("");
  const [donAmount, setDonAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "UPI" | "OTHER">("CASH");

  const loadDonations = async () => {
    if (!userData?.madrassaId) return;
    setDonLoading(true);
    try { setDonations(await donationService.getDonationsByMadrassa(userData.madrassaId)); }
    catch { toast.error("Failed to load donations"); }
    finally { setDonLoading(false); }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !donAmount) { toast.error("Donor name and amount are required"); return; }
    try {
      setDonSubmitting(true);
      await donationService.createDonation(userData!.madrassaId, donorName, parseFloat(donAmount), paymentMethod, userData!.uid, donorContact, purpose);
      toast.success("Donation recorded");
      setDonorName(""); setDonorContact(""); setPurpose(""); setDonAmount(""); setPaymentMethod("CASH");
      setDonDialogOpen(false);
      loadDonations();
    } catch { toast.error("Failed to record donation"); }
    finally { setDonSubmitting(false); }
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm("Delete this donation record?")) return;
    try { await donationService.deleteDonation(id); toast.success("Deleted"); loadDonations(); }
    catch { toast.error("Failed to delete"); }
  };

  useEffect(() => {
    loadExpenses();
    loadDonations();
  }, [userData?.madrassaId]);

  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const donTotal = donations.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      {/* Section Toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setSection("EXPENSES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${section === "EXPENSES" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Wallet className="h-4 w-4" /> Expenses
        </button>
        <button
          onClick={() => setSection("DONATIONS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${section === "DONATIONS" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className="h-4 w-4" /> Donations
        </button>
      </div>

      {/* ====== EXPENSES ====== */}
      {section === "EXPENSES" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-lg">Expenses</h3>
              <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-red-600">Rs.{expTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={expenses.length === 0} onClick={async () => {
                await exportUtils.exportToCSV(expenses.map(e => ({ "Date": (e.date as any)?.toDate ? format((e.date as any).toDate(), "dd MMM yyyy") : "-", "Description": e.description, "Amount": e.amount })), "expenses");
                toast.success("Exported");
              }}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[380px]">
                  <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddExpense} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Amount (Rs.) *</Label>
                      <Input type="number" step="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="e.g. 500" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Bought whiteboard markers" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={expSubmitting}>
                      {expSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Expense
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {expLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center p-8 text-muted-foreground">No expenses recorded yet.</TableCell></TableRow>
                    ) : (
                      expenses.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm text-muted-foreground">{(e.date as any)?.toDate ? format((e.date as any).toDate(), "dd MMM yyyy") : "-"}</TableCell>
                          <TableCell className="font-medium">{e.description}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">-Rs.{e.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(e.id as string)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {expenses.length > 0 && (
                    <tfoot>
                      <TableRow className="bg-muted/50 border-t-2 font-semibold">
                        <TableCell colSpan={2} className="text-sm">Total</TableCell>
                        <TableCell className="text-right text-red-600 font-bold">-Rs.{expTotal.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ====== DONATIONS ====== */}
      {section === "DONATIONS" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-lg">Donations</h3>
              <p className="text-sm text-muted-foreground">Total received: <span className="font-bold text-rose-600">Rs.{donTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={donations.length === 0} onClick={async () => {
                await exportUtils.exportToCSV(donations.map(d => ({ "Date": (d.date as any)?.toDate ? format((d.date as any).toDate(), "dd MMM yyyy") : "-", "Donor": d.donorName || "-", "Purpose": d.purpose || "-", "Amount": d.amount, "Method": d.paymentMethod })), "donations");
                toast.success("Exported");
              }}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Dialog open={donDialogOpen} onOpenChange={setDonDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Record Donation</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Record Donation</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddDonation} className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Donor Name *</Label>
                        <Input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Full name" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact</Label>
                        <Input value={donorContact} onChange={e => setDonorContact(e.target.value)} placeholder="Phone (optional)" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Purpose / Notes</Label>
                      <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Building fund" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Amount (Rs.) *</Label>
                        <Input type="number" step="0.01" value={donAmount} onChange={e => setDonAmount(e.target.value)} placeholder="0.00" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="BANK">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={donSubmitting}>
                      {donSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Donation
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {donLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No donations recorded yet.</TableCell></TableRow>
                    ) : (
                      donations.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm text-muted-foreground">{(d.date as any)?.toDate ? format((d.date as any).toDate(), "dd MMM yyyy") : "-"}</TableCell>
                          <TableCell className="font-medium">{d.donorName || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(d as any).purpose || "-"}</TableCell>
                          <TableCell className="text-sm">{d.paymentMethod}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-600">Rs.{d.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDonation(d.id as string)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {donations.length > 0 && (
                    <tfoot>
                      <TableRow className="bg-muted/50 border-t-2 font-semibold">
                        <TableCell colSpan={4} className="text-sm">Total Received</TableCell>
                        <TableCell className="text-right text-rose-600 font-bold">Rs.{donTotal.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
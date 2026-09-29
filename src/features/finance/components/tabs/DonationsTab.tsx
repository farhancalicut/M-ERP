"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Heart, Download } from "lucide-react";
import { donationService } from "../../services/donationService";
import { Donation } from "@/types/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportUtils } from "@/lib/exportUtils";

export function DonationsTab() {
  const { userData } = useAuthStore();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorContact, setDonorContact] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "UPI" | "OTHER">("CASH");

  const loadDonations = async () => {
    if (!userData?.madrassaId) return;
    try {
      setIsLoading(true);
      const data = await donationService.getDonationsByMadrassa(userData.madrassaId);
      setDonations(data);
    } catch {
      toast.error("Failed to load donations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDonations(); }, [userData?.madrassaId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.madrassaId || !userData.uid) return;
    if (!donorName || !amount) { toast.error("Donor name and amount are required"); return; }

    try {
      setIsSubmitting(true);
      await donationService.createDonation(
        userData.madrassaId,
        donorName,
        parseFloat(amount),
        paymentMethod,
        userData.uid,
        donorContact,
        purpose
      );
      toast.success("Donation recorded successfully");
      setDonorName(""); setDonorContact(""); setPurpose(""); setAmount(""); setPaymentMethod("CASH");
      setIsAddOpen(false);
      loadDonations();
    } catch {
      toast.error("Failed to record donation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donation record?")) return;
    try {
      await donationService.deleteDonation(id);
      toast.success("Donation deleted");
      loadDonations();
    } catch {
      toast.error("Failed to delete donation");
    }
  };

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

  if (isLoading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Donations</h2>
          <p className="text-sm text-muted-foreground">Record and track all donations received by the institution.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            const data = donations.map(d => ({ "Date": (d.date as any)?.toDate ? format((d.date as any).toDate(), "dd MMM yyyy") : "-", "Donor": d.donorName || "-", "Type": (d as any).donationType || (d as any).type || "", "Amount": d.amount, "Notes": (d as any).notes || (d as any).remarks || "" }));
            await exportUtils.exportToCSV(data, "donations");
            toast.success("Donations exported");
          }} disabled={donations.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Record Donation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" /> Record New Donation
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Donor Name *</Label>
                <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="e.g. Ahmed Ali" required />
              </div>
              <div className="space-y-2">
                <Label>Donor Contact (Optional)</Label>
                <Input value={donorContact} onChange={(e) => setDonorContact(e.target.value)} placeholder="Phone or email" />
              </div>
              <div className="space-y-2">
                <Label>Purpose (Optional)</Label>
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Library fund, Renovation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount (Rs.) *</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" required />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Donation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {donations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Received</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">Rs.{totalDonations.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Records</p>
              <p className="text-2xl font-bold mt-1">{donations.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

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
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                    No donations recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>{format(donation.date.toDate(), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{donation.donorName}</div>
                      {donation.donorContact && <div className="text-xs text-muted-foreground">{donation.donorContact}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{donation.purpose || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{donation.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                      +Rs.{donation.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(donation.id as string)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {donations.length > 0 && (
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-sm">Total Donations Received</TableCell>
                  <TableCell className="text-right text-rose-600 font-bold">+Rs.{totalDonations.toFixed(2)}</TableCell>
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
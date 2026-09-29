"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeeCategory, AssignedFee } from "@/types/schema";
import { paymentService } from "@/features/fees/services/paymentService";
import { waiverService } from "@/features/fees/services/waiverService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Loader2, Banknote, Landmark, Smartphone, CreditCard, AlertCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { ReceiptModal } from "./ReceiptModal";

interface QuickCollectSheetProps {
  isOpen: boolean;
  onClose: () => void;
  student: { id: string; name: string; parentId: string; admissionNo?: string };
  category: FeeCategory;
  assignedFee: AssignedFee; // always pre-assigned now
  academicYearId: string;
  madrassaId: string;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "BANK_TRANSFER", label: "Bank", icon: Landmark },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CHEQUE", label: "Cheque", icon: CreditCard },
];

export function QuickCollectSheet({
  isOpen, onClose, student, category, assignedFee, academicYearId, madrassaId, onSuccess,
}: QuickCollectSheetProps) {
  const { userData } = useAuthStore();
  const canWaive = userData?.role === "MANAGEMENT" || userData?.role === "PRINCIPAL";

  const [amount, setAmount] = useState(assignedFee.dueAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI">("CASH");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<any | null>(null);

  // Waiver dialog state
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [waiving, setWaiving] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isPartial = numAmount > 0 && numAmount < assignedFee.dueAmount;

  const handleCollect = async () => {
    if (!userData) return;
    if (numAmount <= 0) { toast.error("Enter a valid amount."); return; }
    if (numAmount > assignedFee.dueAmount) {
      toast.error(`Amount cannot exceed due of Rs.${assignedFee.dueAmount.toLocaleString("en-IN")}`);
      return;
    }
    try {
      setSubmitting(true);
      const payment = await paymentService.collectPayment(
        madrassaId,
        student.id,
        student.parentId,
        academicYearId,
        category.id as string,
        assignedFee.id as string,
        numAmount,
        paymentMethod as any,
        userData.uid,
        userData.role,
        remarks || undefined,
        new Date(paymentDate)
      );
      toast.success("Payment recorded!");
      setCompletedPayment(payment);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaive = async () => {
    if (!userData) return;
    if (!waiverReason.trim()) { toast.error("Please provide a reason for the waiver."); return; }
    const amt = waiverAmount ? parseFloat(waiverAmount) : undefined;
    if (amt !== undefined && (isNaN(amt) || amt <= 0 || amt > assignedFee.dueAmount)) {
      toast.error(`Waiver amount must be between Rs.1 and Rs.${assignedFee.dueAmount}`);
      return;
    }
    try {
      setWaiving(true);
      await waiverService.waiveFee(
        student.id,
        academicYearId,
        assignedFee.id as string,
        userData.uid,
        waiverReason,
        amt
      );
      toast.success("Fee waived successfully!");
      setWaiverOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to waive fee.");
    } finally {
      setWaiving(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-[440px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>
              <span className="font-bold text-foreground">{category.name}</span>
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {student.name}{student.admissionNo ? ` · Adm #${student.admissionNo}` : ""}
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            {/* Fee summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Fee Total</p>
                <p className="font-bold text-sm mt-0.5">Rs.{assignedFee.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-sm text-green-600 mt-0.5">Rs.{assignedFee.paidAmount.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-bold text-sm text-red-600 mt-0.5">Rs.{assignedFee.dueAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount to Collect (Rs.)</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-11 font-semibold text-lg"
              />
              {isPartial && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Partial payment — Rs.{(assignedFee.dueAmount - numAmount).toFixed(2)} will remain due
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <div key={m.id} onClick={() => setPaymentMethod(m.id as any)}
                    className={`border rounded-lg p-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}>
                    <m.icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-10" />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label>Remarks (Optional)</Label>
              <Textarea placeholder="Notes..." value={remarks}
                onChange={e => setRemarks(e.target.value)} className="resize-none h-16 text-sm" />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button className="w-full h-11 font-semibold" onClick={handleCollect}
                disabled={submitting || numAmount <= 0}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Collect Rs.{numAmount > 0 ? numAmount.toLocaleString("en-IN") : "—"}
              </Button>

              {canWaive && (
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                  onClick={() => { setWaiverAmount(""); setWaiverReason(""); setWaiverOpen(true); }}
                  disabled={submitting}>
                  <MinusCircle className="mr-2 h-4 w-4" /> Waive Fee
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Waiver Dialog */}
      <Dialog open={waiverOpen} onOpenChange={setWaiverOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-amber-500" /> Waive Fee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">{student.name} · {category.name}</p>
              <p className="text-muted-foreground mt-0.5">Due: Rs.{assignedFee.dueAmount.toLocaleString("en-IN")}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Waiver Amount (Rs.) <span className="text-muted-foreground font-normal">— leave blank to waive full due amount</span></Label>
              <Input type="number" placeholder={`${assignedFee.dueAmount} (full due)`}
                value={waiverAmount} onChange={e => setWaiverAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea placeholder="e.g. Financial hardship, scholarship, director approval"
                value={waiverReason} onChange={e => setWaiverReason(e.target.value)}
                className="resize-none h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiverOpen(false)} disabled={waiving}>Cancel</Button>
            <Button onClick={handleWaive} disabled={waiving}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {waiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Waiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt after payment */}
      <ReceiptModal payment={completedPayment} studentName={student.name} onClose={() => setCompletedPayment(null)} />
    </>
  );
}
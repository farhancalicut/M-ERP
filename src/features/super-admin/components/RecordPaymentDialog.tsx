"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { billingService } from "@/features/super-admin/services/billingService";
import { PlatformInvoice } from "@/types/schema";

interface RecordPaymentDialogProps {
  invoice: PlatformInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedInvoice: PlatformInvoice) => void;
  currentUserId: string;
}

export function RecordPaymentDialog({
  invoice,
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
}: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRecordPayment = async () => {
    if (!invoice?.id) return;
    setLoading(true);
    try {
      await billingService.updateInvoiceStatus(invoice.id, "PAID", currentUserId);
      toast.success("Payment recorded successfully");
      onSuccess({ ...invoice, status: "PAID" });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Mark invoice <strong>{invoice?.invoiceNumber}</strong> as paid?
            This will update the status to PAID and record the payment timestamp.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
            <span className="text-sm font-medium text-muted-foreground">Amount to Collect:</span>
            <span className="font-bold text-lg">₹{invoice?.amount?.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRecordPayment} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

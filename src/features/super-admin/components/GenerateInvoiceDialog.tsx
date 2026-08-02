"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { billingService } from "@/features/super-admin/services/billingService";
import { Madrassa, PlatformInvoice } from "@/types/schema";
import { Timestamp } from "firebase/firestore";

const invoiceSchema = z.object({
  madrassaId: z.string().min(1, "Please select a Madrassa"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  billingPeriod: z.string().min(1, "Billing period is required"),
  dueDays: z.coerce.number().min(1, "Due days must be at least 1"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface GenerateInvoiceDialogProps {
  madrassas: Madrassa[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice: PlatformInvoice) => void;
  currentUserId: string;
}

export function GenerateInvoiceDialog({
  madrassas,
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
}: GenerateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      madrassaId: "",
      amount: 1000,
      billingPeriod: currentMonth,
      dueDays: 14,
    },
  });

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + data.dueDays);

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const invoice = await billingService.createInvoice(
        {
          invoiceNumber,
          madrassaId: data.madrassaId,
          amount: data.amount,
          billingPeriod: data.billingPeriod,
          dueDate: Timestamp.fromDate(dueDate),
        },
        currentUserId
      );

      toast.success("Invoice generated successfully");
      onSuccess(invoice);
      onClose();
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create a new billing invoice for a Madrassa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Madrassa</Label>
              <Select
                value={form.watch("madrassaId")}
                onValueChange={(val) => form.setValue("madrassaId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Madrassa" />
                </SelectTrigger>
                <SelectContent>
                  {madrassas.map(m => (
                    <SelectItem key={m.id} value={m.id!}>
                      {m.name} ({m.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.madrassaId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.madrassaId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Billing Period</Label>
              <Input
                placeholder="e.g. August 2026"
                {...form.register("billingPeriod")}
              />
              {form.formState.errors.billingPeriod && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.billingPeriod.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Due In (Days)</Label>
              <Input
                type="number"
                {...form.register("dueDays")}
              />
              {form.formState.errors.dueDays && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.dueDays.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

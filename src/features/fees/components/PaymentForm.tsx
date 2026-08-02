"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, PaymentFormValues } from "../schemas/feeSchemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface PaymentFormProps {
  studentId: string;
  maxAmount: number;
  feeName: string;
  role?: string;
  allowPartialPayment?: boolean;
  action: (data: PaymentFormValues) => Promise<void>;
}

export function PaymentForm({
  studentId,
  maxAmount,
  feeName,
  role = "TEACHER",
  allowPartialPayment = true,
  action
}: PaymentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      amount: maxAmount,
      paymentMethod: "CASH",
      remarks: "",
      paymentDate: new Date()
    }
  });

  const onSubmit = async (data: PaymentFormValues) => {
    if (data.amount > maxAmount) {
      form.setError("amount", { message: `Cannot exceed due amount of ${maxAmount}` });
      return;
    }
    
    if (!allowPartialPayment && data.amount < maxAmount) {
      form.setError("amount", { message: `Partial payments are not allowed. You must pay the full ${maxAmount}.` });
      return;
    }

    try {
      setIsLoading(true);
      await action(data);
      toast.success("Payment collected successfully");
      router.push(`/fees/students/${studentId}`);
      router.refresh();
    } catch (error: Error | unknown) {
      // @ts-ignore
      toast.error(error.message || "Failed to collect payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm font-medium">Paying for: <span className="font-bold">{feeName}</span></p>
          <p className="text-sm">Total Due: <span className="font-bold text-red-600">₹{maxAmount}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Amount (₹)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    max={maxAmount} 
                    disabled={!allowPartialPayment || isLoading}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    value={format(field.value, "yyyy-MM-dd")}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Transaction ID, check number, or other details..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {role === 'TEACHER' ? "Submit for Verification" : "Collect Payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

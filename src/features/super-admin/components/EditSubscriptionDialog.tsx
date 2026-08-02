"use client";

import { useEffect, useState } from "react";
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
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, SubscriptionStatus } from "@/types/schema";

const subscriptionSchema = z.object({
  subscriptionPlan: z.string().min(1, "Plan is required"),
  subscriptionStatus: z.enum(["ACTIVE", "EXPIRED", "LOCKED"]),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface EditSubscriptionDialogProps {
  madrassa: Madrassa | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMadrassa: Madrassa) => void;
}

const DEFAULT_PLANS = ["Free", "Basic", "Premium", "Enterprise", "Custom"];

export function EditSubscriptionDialog({
  madrassa,
  isOpen,
  onClose,
  onSuccess,
}: EditSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      subscriptionPlan: "Basic",
      subscriptionStatus: "ACTIVE",
    },
  });

  // Update form when madrassa changes
  useEffect(() => {
    if (madrassa) {
      form.reset({
        subscriptionPlan: madrassa.subscriptionPlan || "Basic",
        subscriptionStatus: madrassa.subscriptionStatus || "ACTIVE",
      });
    }
  }, [madrassa, form]);

  const onSubmit = async (data: SubscriptionFormData) => {
    if (!madrassa?.id) return;
    
    setLoading(true);
    try {
      await madrassaService.updateMadrassa(madrassa.id, {
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
      });
      
      toast.success("Subscription updated successfully");
      onSuccess({ ...madrassa, ...data });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update the subscription plan and status for {madrassa?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Input
                placeholder="e.g. Premium"
                {...form.register("subscriptionPlan")}
                list="default-plans"
              />
              <datalist id="default-plans">
                {DEFAULT_PLANS.map(plan => (
                  <option key={plan} value={plan} />
                ))}
              </datalist>
              {form.formState.errors.subscriptionPlan && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.subscriptionPlan.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("subscriptionStatus")}
                onValueChange={(val) =>
                  form.setValue("subscriptionStatus", val as SubscriptionStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

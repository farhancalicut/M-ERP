"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, ShieldAlert, CheckCircle2, CalendarDays, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, PlatformSubscriptionPlan, Status } from "@/types/schema";
import { Timestamp } from "firebase/firestore";

const formSchema = z.object({
  subscriptionPlan: z.string().min(1, "Please select a plan"),
  subscriptionExpiry: z.date({
    message: "Expiry date is required",
  }),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditSubscriptionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [madrassa, setMadrassa] = useState<Madrassa | null>(null);
  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subscriptionPlan: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return;
        
        const [madrassaData, plansData] = await Promise.all([
          madrassaService.getMadrassaById(id as string),
          madrassaService.getSubscriptionPlans()
        ]);
        
        if (madrassaData) {
          setMadrassa(madrassaData);
          form.reset({
            subscriptionPlan: madrassaData.subscriptionPlan,
            subscriptionExpiry: madrassaData.subscriptionExpiry?.toDate() || new Date(),
            status: madrassaData.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
          });
        }
        setPlans(plansData);
      } catch (error) {
        toast.error("Failed to load subscription data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, form]);

  const onSubmit = async (data: FormValues) => {
    if (!id || !madrassa) return;
    setIsSaving(true);
    try {
      await madrassaService.updateMadrassa(id as string, {
        subscriptionPlan: data.subscriptionPlan,
        subscriptionExpiry: Timestamp.fromDate(data.subscriptionExpiry),
        status: data.status as Status,
        subscriptionStatus: data.status === "SUSPENDED" ? "LOCKED" : "ACTIVE"
      });
      toast.success("Subscription updated successfully");
      router.push(`/super-admin/madrassas/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">Loading Data...</p>
      </div>
    );
  }

  if (!madrassa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">Madrassa Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/super-admin/madrassas">Return to Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/super-admin/madrassas/${id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Override billing controls for {madrassa.name}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900">Manual Override Active</h4>
          <p className="text-amber-700 text-sm mt-1">
            Since payments are collected manually, use this panel to log upgrades and extend expiry dates once payment is received. Suspending an account will immediately block tenant access.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <ShieldAlert className="w-5 h-5 text-primary" /> Active Plan Selection
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {plans.map((plan) => {
                  const isSelected = form.watch("subscriptionPlan") === plan.name;
                  return (
                    <div 
                      key={plan.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}
                      onClick={() => form.setValue("subscriptionPlan", plan.name)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{plan.name} {plan.isTrial && <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">Trial</span>}</h4>
                        <span className="text-lg font-bold">₹{plan.amount}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {plan.studentLimit === 'Unlimited' ? 'Unlimited students' : `Up to ${plan.studentLimit} students`}
                      </p>
                      {isSelected && (
                        <div className="mt-2 text-sm text-primary flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Current Selection
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.subscriptionPlan && (
                <p className="text-sm text-destructive">{form.formState.errors.subscriptionPlan.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> Expiry Management
                </h3>
                
                <FormField
                  control={form.control}
                  name="subscriptionExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Expiry Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-2">
                        Setting this date in the past will trigger the Grace Period (0-7 days) or full suspension (7+ days).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      form.setValue("subscriptionExpiry", d);
                    }}
                  >
                    +1 Year
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      form.setValue("subscriptionExpiry", d);
                    }}
                  >
                    +1 Month
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <ShieldAlert className="w-5 h-5 text-primary" /> Account Status
                </h3>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Access Override</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active (Normal Access)</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended (Blocked Access)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        Setting status to Suspended overrides the grace period and immediately revokes login access.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t gap-4">
              <Button variant="outline" type="button" asChild>
                <Link href={`/super-admin/madrassas/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Subscription State"}
                {!isSaving && <Save className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Save, ArrowLeft, Copy, Check, AlertTriangle, CheckCircle2, CreditCard, User, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { useAuthStore } from "@/stores/authStore";
import { PlatformSubscriptionPlan, PlatformBoard } from "@/types/schema";
import { settingsService } from "@/features/super-admin/services/settingsService";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  board: z.string().min(1, "Please select a board"),
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(4, "Valid pincode required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  email: z.string().email("Invalid email address"),
  
  subscriptionPlan: z.string().min(1, "Please select a plan"),
  subscriptionExpiry: z.date({
    message: "Expiry date is required",
  }),

  managerName: z.string().min(2, "Manager name required"),
  managerEmail: z.string().email("Invalid manager email"),
  managerMobile: z.string().min(10, "Valid mobile required"),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Madrassa Details", icon: Building2 },
  { id: 2, title: "Subscription Plan", icon: CreditCard },
  { id: 3, title: "Manager Account", icon: User },
  { id: 4, title: "Review", icon: FileText },
];

export default function NewMadrassaPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ madrassaCode: string; managerEmail: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [boards, setBoards] = useState<PlatformBoard[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      addressLine1: "",
      city: "",
      state: "",
      pincode: "",
      contactNumber: "",
      email: "",
      subscriptionPlan: "",
      managerName: "",
      managerEmail: "",
      managerMobile: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedPlans, fetchedBoards] = await Promise.all([
          madrassaService.getSubscriptionPlans(),
          settingsService.getBoards()
        ]);
        setPlans(fetchedPlans);
        setBoards(fetchedBoards);
      } catch (error) {
        toast.error("Failed to load plans or boards");
      } finally {
        setIsLoadingPlans(false);
        setIsLoadingBoards(false);
      }
    };
    loadData();
  }, []);

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ["name", "board", "addressLine1", "city", "state", "pincode", "contactNumber", "email"];
    } else if (step === 2) {
      fieldsToValidate = ["subscriptionPlan", "subscriptionExpiry"];
    } else if (step === 3) {
      fieldsToValidate = ["managerName", "managerEmail", "managerMobile"];
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const onSubmit = async (data: FormValues) => {
    if (!userData?.uid) return;
    
    setIsSubmitting(true);
    try {
      // Fake delay for progress indicator as requested (2-4 seconds)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const result = await madrassaService.onboardMadrassa(data as any, userData.uid);
      setCredentials(result);
      toast.success("Madrassa onboarded successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to onboard madrassa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Welcome to M-ERP!
Madrassa Code: ${credentials.madrassaCode}
Manager Email: ${credentials.managerEmail}
Temporary Password: ${credentials.tempPassword}

Please activate your account by logging in with your Email and Temporary Password.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (credentials) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/madrassas">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Complete</h1>
        </div>

        <div className="bg-card border rounded-lg p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-2">Madrassa Created Successfully!</h2>
            <p className="text-muted-foreground">
              Please share these credentials with the Madrassa Manager securely. They will be prompted to change their password upon first login.
            </p>
          </div>

          <div className="bg-muted p-6 rounded-md text-left space-y-3 font-mono text-sm relative">
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-4 right-4"
              onClick={copyCredentials}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            
            <p><span className="text-muted-foreground">Madrassa Name:</span> <span className="font-bold">{form.getValues().name}</span></p>
            <p><span className="text-muted-foreground">Subscription Plan:</span> <span className="font-bold capitalize">{form.getValues().subscriptionPlan.toLowerCase()}</span></p>
            <div className="border-t border-border/50 my-2 pt-2"></div>
            <p><span className="text-muted-foreground">Manager Email:</span> {credentials.managerEmail}</p>
            <p><span className="text-muted-foreground">Temp Password:</span> <span className="font-bold">{credentials.tempPassword}</span></p>
          </div>

          <Button className="w-full" asChild>
            <Link href="/super-admin/madrassas">Return to Madrassas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.name === form.watch("subscriptionPlan"));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/madrassas">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboard New Madrassa</h1>
          <p className="text-muted-foreground mt-1">
            Follow the steps to set up a new institution.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2 bg-card px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                  isCurrent ? 'border-primary text-primary bg-background' : 
                  'border-muted bg-background text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* STEP 1: MADRASSA DETAILS */}
            <div className={step === 1 ? 'block' : 'hidden'}>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Step 1: Madrassa Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Madrassa Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Al-Noor Islamic Academy" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Assignment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingBoards ? (
                            <SelectItem value="loading" disabled>Loading boards...</SelectItem>
                          ) : boards.length === 0 ? (
                            <SelectItem value="none" disabled>No boards found</SelectItem>
                          ) : (
                            boards.map(b => (
                              <SelectItem key={b.id} value={b.code}>{b.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="bg-amber-50 text-amber-800 p-2 rounded flex items-start gap-2 text-xs mt-1 border border-amber-200">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>Board cannot be changed later without Super Admin assistance.</p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution Email</FormLabel>
                      <FormControl><Input placeholder="contact@alnoor.edu" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address, building name..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State (e.g. Kerala)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* STEP 2: SUBSCRIPTION PLAN */}
            <div className={step === 2 ? 'block' : 'hidden'}>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Step 2: Subscription Plan
              </h3>
              
              {isLoadingPlans ? (
                <div className="py-8 text-center text-muted-foreground">Loading plans...</div>
              ) : plans.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No subscription plans found. Please configure them in Settings.</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {plans.map((plan) => {
                      const isSelected = form.watch("subscriptionPlan") === plan.name;
                      return (
                        <div 
                          key={plan.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}
                          onClick={() => {
                            form.setValue("subscriptionPlan", plan.name);
                            if (plan.isTrial) {
                              const d = new Date();
                              d.setDate(d.getDate() + (plan.trialDays || 30));
                              form.setValue("subscriptionExpiry", d);
                            } else {
                              // Default to 1 year for paid plans initially
                              const d = new Date();
                              d.setFullYear(d.getFullYear() + 1);
                              form.setValue("subscriptionExpiry", d);
                            }
                          }}
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
                              <CheckCircle2 className="w-4 h-4" /> Selected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {form.formState.errors.subscriptionPlan && (
                    <p className="text-sm text-destructive">{form.formState.errors.subscriptionPlan.message}</p>
                  )}

                  {selectedPlan && (
                    <div className="mt-6 pt-6 border-t">
                      <FormField
                        control={form.control}
                        name="subscriptionExpiry"
                        render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date"
                                disabled={selectedPlan.isTrial}
                                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                className={selectedPlan.isTrial ? "bg-muted" : ""}
                              />
                            </FormControl>
                            {selectedPlan.isTrial && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Trial expiry is locked to {selectedPlan.trialDays || 30} days automatically.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 3: MANAGER ACCOUNT */}
            <div className={step === 3 ? 'block' : 'hidden'}>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Step 3: Manager Account
              </h3>
              <p className="text-sm text-muted-foreground mb-6 bg-muted p-3 rounded-md">
                This person will receive the first login credentials and act as the MANAGEMENT role for this institution.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="managerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Ahmed Hassan" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="managerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Email</FormLabel>
                      <FormControl><Input placeholder="ahmed@example.com" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="managerMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* STEP 4: REVIEW & SUBMIT */}
            <div className={step === 4 ? 'block' : 'hidden'}>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Step 4: Review Details
              </h3>
              
              <div className="space-y-6">
                <div className="bg-muted/50 p-5 rounded-lg border border-border/50">
                  <h4 className="font-medium mb-3 pb-2 border-b">Madrassa Details</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Name:</p>
                    <p className="font-medium">{form.getValues().name}</p>
                    <p className="text-muted-foreground">Board:</p>
                    <p className="font-medium">{form.getValues().board}</p>
                    <p className="text-muted-foreground">Phone:</p>
                    <p>{form.getValues().contactNumber}</p>
                    <p className="text-muted-foreground">Email:</p>
                    <p>{form.getValues().email}</p>
                    <p className="text-muted-foreground">Address:</p>
                    <p>{form.getValues().addressLine1}, {form.getValues().city}, {form.getValues().state} {form.getValues().pincode}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-5 rounded-lg border border-border/50">
                  <h4 className="font-medium mb-3 pb-2 border-b">Subscription</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Plan:</p>
                    <p className="font-medium capitalize">{form.getValues().subscriptionPlan?.toLowerCase()}</p>
                    <p className="text-muted-foreground">Expiry Date:</p>
                    <p>{form.getValues().subscriptionExpiry ? format(form.getValues().subscriptionExpiry, 'PP') : 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-5 rounded-lg border border-border/50">
                  <h4 className="font-medium mb-3 pb-2 border-b">Manager Account</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Name:</p>
                    <p className="font-medium">{form.getValues().managerName}</p>
                    <p className="text-muted-foreground">Email:</p>
                    <p>{form.getValues().managerEmail}</p>
                    <p className="text-muted-foreground">Mobile:</p>
                    <p>{form.getValues().managerMobile}</p>
                  </div>
                </div>
              </div>

              {isSubmitting && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-border/50">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-medium">Provisioning tenant & generating credentials...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a few seconds.</p>
                </div>
              )}
            </div>

            {/* NAVIGATION BUTTONS */}
            <div className="flex justify-between pt-6 border-t mt-8">
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleBack}
                disabled={step === 1 || isSubmitting}
              >
                Back
              </Button>

              {step < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Confirm & Create Madrassa"}
                  {!isSubmitting && <Save className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

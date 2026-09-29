"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, CreditCard, Settings, BookOpen, Palette, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PlatformSubscriptionPlan, PlatformBoard } from "@/types/schema";
import { settingsService } from "@/features/super-admin/services/settingsService";
import { useThemeStore } from "@/stores/themeStore";
import { useTheme } from "next-themes";

const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
  studentLimit: z.string().min(1, "Student limit is required"),
  isTrial: z.boolean().default(false),
  trialDays: z.coerce.number().optional(),
});

const boardSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
});

type PlanFormValues = z.infer<typeof planSchema>;
type BoardFormValues = z.infer<typeof boardSchema>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, fontFamily, interfaceScale, setColorTheme, setFontFamily, setInterfaceScale } = useThemeStore();

  const handleResetAppearance = () => {
    setColorTheme('teal');
    setFontFamily('inter');
    setInterfaceScale(100);
    setTheme('light');
  };

  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [boards, setBoards] = useState<PlatformBoard[]>([]);

  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);

  const [editingPlan, setEditingPlan] = useState<PlatformSubscriptionPlan | null>(null);
  const [editingBoard, setEditingBoard] = useState<PlatformBoard | null>(null);

  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  // General Settings State Mock
  const [platformName, setPlatformName] = useState("M-ERP Platform");
  const [supportEmail, setSupportEmail] = useState("support@m-erp.com");
  const [gracePeriod, setGracePeriod] = useState("7");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const handleSaveGeneral = () => {
    setIsSavingGeneral(true);
    setTimeout(() => {
      setIsSavingGeneral(false);
      toast.success("General platform settings saved successfully");
    }, 800);
  };

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: { name: "", amount: 0, studentLimit: "100", isTrial: false, trialDays: undefined },
  });

  const boardForm = useForm<BoardFormValues>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: "", code: "" },
  });

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const fetchedPlans = await settingsService.getSubscriptionPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      toast.error("Failed to fetch subscription plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchBoards = async () => {
    setIsLoadingBoards(true);
    try {
      const fetchedBoards = await settingsService.getBoards();
      setBoards(fetchedBoards);
    } catch (error) {
      toast.error("Failed to fetch boards");
    } finally {
      setIsLoadingBoards(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchBoards();
  }, []);

  const handleOpenPlanDialog = (plan?: PlatformSubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      planForm.reset({
        name: plan.name,
        amount: plan.amount,
        studentLimit: plan.studentLimit.toString(),
        isTrial: plan.isTrial,
        trialDays: plan.trialDays || 30,
      });
    } else {
      setEditingPlan(null);
      planForm.reset({ name: "", amount: 0, studentLimit: "100", isTrial: false, trialDays: 30 });
    }
    setIsPlanDialogOpen(true);
  };

  const handleOpenBoardDialog = (board?: PlatformBoard) => {
    if (board) {
      setEditingBoard(board);
      boardForm.reset({ name: board.name, code: board.code });
    } else {
      setEditingBoard(null);
      boardForm.reset({ name: "", code: "" });
    }
    setIsBoardDialogOpen(true);
  };

  const onPlanSubmit = async (data: PlanFormValues) => {
    setIsSavingPlan(true);
    try {
      const formattedData = {
        ...data,
        studentLimit: data.studentLimit === "Unlimited" || data.studentLimit.toLowerCase() === "unlimited"
          ? "Unlimited"
          : parseInt(data.studentLimit, 10),
      };

      await settingsService.saveSubscriptionPlan(formattedData as any, editingPlan?.id);
      toast.success(`Plan ${editingPlan ? 'updated' : 'added'} successfully`);
      setIsPlanDialogOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error("Failed to save plan");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const onBoardSubmit = async (data: BoardFormValues) => {
    setIsSavingBoard(true);
    try {
      await settingsService.saveBoard(data as any, editingBoard?.id);
      toast.success(`Board ${editingBoard ? 'updated' : 'added'} successfully`);
      setIsBoardDialogOpen(false);
      fetchBoards();
    } catch (error) {
      toast.error("Failed to save board");
    } finally {
      setIsSavingBoard(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage platform configurations, subscription tiers, and academic boards.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="boards" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Boards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">General Platform Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage global platform identity and defaults for all Madrassas.</p>
              </div>
              <Button onClick={handleSaveGeneral} disabled={isSavingGeneral} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSavingGeneral ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            <div className="p-6 space-y-8">
              {/* Platform Identity */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Platform Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platformName" className="text-slate-700 dark:text-slate-300">Platform Name</Label>
                    <Input id="platformName" value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">The global name displayed to all users.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail" className="text-slate-700 dark:text-slate-300">Support Email</Label>
                    <Input id="supportEmail" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Contact email shown to Madrassa admins.</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

              {/* Onboarding Defaults */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Onboarding Defaults</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gracePeriod" className="text-slate-700 dark:text-slate-300">Subscription Grace Period (Days)</Label>
                    <Input id="gracePeriod" type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Days allowed to login after subscription expiry.</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

              {/* System Maintenance */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Maintenance</h3>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-slate-800 dark:text-slate-100 font-semibold text-base">Maintenance Mode</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Prevent all non-Super Admin users from logging in.
                    </p>
                  </div>
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broadcastMsg" className="text-slate-700 dark:text-slate-300">Global Broadcast Message</Label>
                  <Textarea
                    id="broadcastMsg"
                    placeholder="E.g., System maintenance scheduled for Friday at midnight..."
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-24"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">This message will be displayed as an alert banner across all Madrassa dashboards.</p>
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Subscription Plans</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the plans available for Madrassas to subscribe to.</p>
              </div>
              <Button onClick={() => handleOpenPlanDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add New Plan
              </Button>
            </div>

            <div className="p-6">
              {isLoadingPlans ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">No plans found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4 mt-1">Get started by creating your first subscription plan.</p>
                  <Button onClick={() => handleOpenPlanDialog()} variant="outline">Create Plan</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map(plan => (
                    <div key={plan.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative flex flex-col hover:shadow-md transition-shadow hover:border-slate-300 bg-white dark:bg-slate-900">
                      <div className="absolute top-4 right-4">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPlanDialog(plan)} className="text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {plan.name}
                          {plan.isTrial && <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-primary/20">Trial</span>}
                        </h3>
                        <div className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-3">
                          ₹{plan.amount} <span className="text-sm font-semibold text-slate-400 tracking-normal">/ year</span>
                        </div>
                      </div>

                      <div className="space-y-3 mt-6 text-sm flex-1">
                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3">
                          <span className="text-slate-500 dark:text-slate-400">Student Limit</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{plan.studentLimit}</span>
                        </div>
                        {plan.isTrial && (
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3">
                            <span className="text-slate-500 dark:text-slate-400">Trial Duration</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{plan.trialDays} days</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="boards" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Academic Boards</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the list of recognized educational boards.</p>
              </div>
              <Button onClick={() => handleOpenBoardDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add New Board
              </Button>
            </div>

            <div className="p-6">
              {isLoadingBoards ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">No boards configured</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4 mt-1">Start by adding a board (e.g., AP Samastha).</p>
                  <Button onClick={() => handleOpenBoardDialog()} variant="outline">Add Board</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {boards.map(board => (
                    <div key={board.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative flex items-center justify-between hover:border-slate-300 hover:shadow-sm transition-all bg-white dark:bg-slate-900">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{board.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Code: <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{board.code}</span></p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenBoardDialog(board)} className="text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Basic, Pro" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yearly Amount (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="studentLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Limit</FormLabel>
                    <FormControl><Input placeholder="Number or 'Unlimited'" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="isTrial"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Trial Plan</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Is this a free trial plan?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {planForm.watch("isTrial") && (
                <FormField
                  control={planForm.control}
                  name="trialDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trial Duration (Days)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingPlan}>
                  {isSavingPlan ? "Saving..." : "Save Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Board Dialog */}
      <Dialog open={isBoardDialogOpen} onOpenChange={setIsBoardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBoard ? 'Edit Board' : 'Add New Board'}</DialogTitle>
          </DialogHeader>
          <Form {...boardForm}>
            <form onSubmit={boardForm.handleSubmit(onBoardSubmit)} className="space-y-4">
              <FormField
                control={boardForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Name</FormLabel>
                    <FormControl><Input placeholder="e.g. AP Samastha" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={boardForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Code (Internal)</FormLabel>
                    <FormControl><Input placeholder="e.g. AP_SAMASTHA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBoardDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingBoard}>
                  {isSavingBoard ? "Saving..." : "Save Board"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { routineService } from "@/features/routines/services/routineService";
import { Class, RoutineTemplate } from "@/types/schema";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  cutoffTime: z.string().min(5, "Cutoff time is required"), // e.g. "23:59"
  isActive: z.boolean(),
  classIds: z.array(z.string()).min(1, "Select at least one class"),
  tasks: z.array(z.object({
    id: z.string(),
    name: z.string().min(2, "Task name is required")
  })).min(1, "Add at least one task")
});

type FormValues = z.infer<typeof formSchema>;

export function RoutineTemplateForm() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string | undefined;
  const isEdit = !!templateId && templateId !== "new";
  
  const { userData } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(isEdit);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      cutoffTime: "23:59",
      isActive: true,
      classIds: [],
      tasks: [{ id: crypto.randomUUID(), name: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    name: "tasks",
    control: form.control
  });

  useEffect(() => {
    if (!userData?.madrassaId) return;
    
    const init = async () => {
      try {
        const clsRes = await classService.getClasses(userData.madrassaId, "ALL");
        setClasses(clsRes.classes);

        if (isEdit) {
          const template = await routineService.getTemplateById(templateId!);
          if (template) {
            form.reset({
              name: template.name,
              description: template.description || "",
              cutoffTime: template.cutoffTime || "23:59",
              isActive: template.isActive,
              classIds: template.classIds,
              tasks: template.tasks
            });
          } else {
            toast.error("Template not found");
            router.push("/routines");
          }
        }
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userData?.madrassaId, isEdit, templateId, form, router]);

  const onSubmit = async (data: FormValues) => {
    if (!userData?.madrassaId || !userData?.uid) return;
    
    try {
      if (isEdit) {
        await routineService.updateTemplate(templateId!, data as any, userData.uid);
        toast.success("Template updated successfully");
      } else {
        await routineService.createTemplate({
          ...data,
          madrassaId: userData.madrassaId,
        } as any, userData.uid);
        toast.success("Template created successfully");
      }
      router.push("/routines");
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading form...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{isEdit ? 'Edit Template' : 'Create Template'}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Configure daily tasks and assign them to classes.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Primary Classes Daily Routine" className="h-10 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Details about this routine..." className="min-h-[70px] text-sm resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="cutoffTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Cutoff Time</FormLabel>
                      <FormControl>
                        <Input type="time" className="h-10 text-sm" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Parents must submit before this time.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 shadow-sm bg-card sm:mt-[22px]">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-4 w-4 mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm cursor-pointer font-medium">Active Template</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Visible to parents for daily logs
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="classIds"
                render={({ field }) => {
                  const selectedClassIds: string[] = field.value || [];
                  const allSelected = classes.length > 0 && classes.every(c => c.id && selectedClassIds.includes(c.id));
                  
                  const handleToggleAllClasses = (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (allSelected) {
                      field.onChange([]);
                    } else {
                      field.onChange(classes.map(c => c.id as string).filter(Boolean));
                    }
                  };

                  return (
                    <FormItem className="pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <FormLabel className="text-sm font-medium">Assigned Classes</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Select classes for this routine.
                          </p>
                        </div>
                        {classes.length > 0 && (
                          <div
                            onClick={handleToggleAllClasses}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer transition-colors select-none shrink-0 w-fit ${
                              allSelected
                                ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                                : "bg-muted/50 border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              allSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-700 bg-background"
                            }`}>
                              {allSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span>Mark All</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              ({selectedClassIds.length}/{classes.length})
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {classes.map((cls) => {
                          const isChecked = selectedClassIds.includes(cls.id as string);
                          return (
                            <label
                              key={cls.id}
                              className="flex flex-row items-start space-x-3 rounded-lg border px-4 py-3 bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors select-none text-sm"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...selectedClassIds, cls.id]);
                                  } else {
                                    field.onChange(selectedClassIds.filter((id: string) => id !== cls.id));
                                  }
                                }}
                                className="h-4 w-4 shrink-0"
                              />
                              <span className="font-medium leading-tight cursor-pointer w-full mt-0.5">
                                {cls.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Tasks</CardTitle>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => append({ id: crypto.randomUUID(), name: "" })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2.5">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-row items-start sm:items-center gap-3 p-3 sm:p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                  <span className="text-sm font-bold text-muted-foreground shrink-0 w-6 text-center mt-2.5 sm:mt-0">
                    {index + 1}.
                  </span>
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-1">
                        <FormControl>
                          <Input placeholder="e.g. Read Surah Yaseen" className="h-10 text-sm" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0 h-10 w-10 mt-0.5 sm:mt-0" 
                    onClick={() => remove(index)} 
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-10 text-sm px-6" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto h-11 sm:h-10 text-sm font-semibold px-8" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

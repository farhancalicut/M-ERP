"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { gradeSettingsService } from "../services/gradeSettingsService";
import { useAuthStore } from "@/stores/authStore";
import { v4 as uuidv4 } from "uuid";
import { ArrowRight, Save } from "lucide-react";

const gradeSchema = z.object({
  id: z.string(),
  grade: z.string().min(1, "Grade name is required"),
  minPercentage: z.coerce.number().min(0).max(100),
  maxPercentage: z.coerce.number().min(0).max(100),
  gradePoint: z.coerce.number().min(0),
  remarks: z.string()
});

const gradeSettingsSchema = z.object({
  grades: z.array(gradeSchema)
});

type GradeSettingsFormData = z.infer<typeof gradeSettingsSchema>;

export function GradeSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<GradeSettingsFormData>({
    resolver: zodResolver(gradeSettingsSchema) as any,
    defaultValues: {
      grades: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "grades"
  });

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const settings = await gradeSettingsService.getGradeSettings(userData.madrassaId);
          if (settings) {
            form.reset({
              grades: settings.grades || []
            });
          } else {
            // Default grades
            form.reset({
              grades: [
                { id: uuidv4(), grade: "A+", minPercentage: 91, maxPercentage: 100, gradePoint: 10, remarks: "Excellent" },
                { id: uuidv4(), grade: "A", minPercentage: 81, maxPercentage: 90, gradePoint: 9, remarks: "Very Good" },
                { id: uuidv4(), grade: "B+", minPercentage: 71, maxPercentage: 80, gradePoint: 8, remarks: "Good" },
                { id: uuidv4(), grade: "B", minPercentage: 61, maxPercentage: 70, gradePoint: 7, remarks: "Above Average" },
                { id: uuidv4(), grade: "C+", minPercentage: 51, maxPercentage: 60, gradePoint: 6, remarks: "Satisfactory" },
                { id: uuidv4(), grade: "C", minPercentage: 41, maxPercentage: 50, gradePoint: 5, remarks: "Average" },
                { id: uuidv4(), grade: "D", minPercentage: 35, maxPercentage: 40, gradePoint: 4, remarks: "Pass" },
                { id: uuidv4(), grade: "E", minPercentage: 0, maxPercentage: 34, gradePoint: 0, remarks: "Fail" }
              ]
            });
          }
        } catch (error) {
          toast.error("Failed to load settings");
        } finally {
          setInitialLoading(false);
        }
      }
    }
    loadData();
  }, [userData?.madrassaId, form]);

  const onSubmit = async (data: GradeSettingsFormData) => {
    if (!userData?.madrassaId || !userData?.id) return;
    
    let isNavigating = false;
    setLoading(true);
    try {
      // Validation happens in service, but we can do a quick check here too
      gradeSettingsService.validateGrades(data.grades);
      
      await gradeSettingsService.updateGradeSettings(userData.madrassaId, {
        grades: data.grades
      }, userData.id);
      
      toast.success("Grade settings saved successfully");
      
      if (isSetupIncomplete) {
        isNavigating = true;
        router.push("/settings/attendance");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      if (!isNavigating) {
        setLoading(false);
      }
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade Configuration</CardTitle>
        <CardDescription>Configure grading boundaries and passing criteria.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 max-w-sm">
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Grade Boundaries</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), grade: "", minPercentage: 0, maxPercentage: 0, gradePoint: 0, remarks: "" })}>
                <Plus className="h-4 w-4 mr-2" /> Add Grade
              </Button>
            </div>

            <div className="border rounded-md divide-y overflow-x-auto">
              <div className="grid grid-cols-6 gap-4 p-4 font-medium bg-muted/50 min-w-[700px]">
                <div>Grade Name</div>
                <div>Min %</div>
                <div>Max %</div>
                <div>Grade Point</div>
                <div>Remarks</div>
                <div className="text-right">Actions</div>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-6 gap-4 p-4 items-center min-w-[700px]">
                  <Input {...form.register(`grades.${index}.grade`)} placeholder="A+" />
                  <Input type="number" {...form.register(`grades.${index}.minPercentage`)} />
                  <Input type="number" {...form.register(`grades.${index}.maxPercentage`)} />
                  <Input type="number" step="0.1" {...form.register(`grades.${index}.gradePoint`)} />
                  <Input {...form.register(`grades.${index}.remarks`)} placeholder="Excellent" />
                  <div className="text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No grades configured.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSetupIncomplete ? (
                <>Save & Continue <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Settings</>
              )}
            </Button>
            {!isSetupIncomplete && (
              <Button type="button" variant="outline" onClick={() => { setLoading(true); router.push("/settings/attendance"); }}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

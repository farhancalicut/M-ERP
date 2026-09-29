"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Exam, Class, Subject } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check } from "lucide-react";
import { format } from "date-fns";

export interface ExamFormValues {
  name: string;
  examType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  classIds: string[];
  includeCE: boolean;
  maxCEMarks: number;
}

interface ExamFormProps {
  initialData?: Exam;
  classes: Class[];
  onSubmit: (data: ExamFormValues) => Promise<void>;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function ExamForm({ initialData, classes, onSubmit, isSubmitting, disabled }: ExamFormProps) {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<ExamFormValues>({
    defaultValues: {
      name: initialData?.name || "",
      examType: initialData?.examType || "Monthly",
      startDate: initialData?.startDate ? format(initialData.startDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      endDate: initialData?.endDate ? format(initialData.endDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      status: initialData?.status || "ACTIVE",
      classIds: initialData?.classIds || [],
      includeCE: initialData?.includeCE || false,
      maxCEMarks: initialData?.maxCEMarks || 20
    }
  });

  const selectedClassIds = watch("classIds");
  const includeCE = watch("includeCE");

  const toggleClass = (classId: string, onChange: (val: string[]) => void) => {
    if (selectedClassIds.includes(classId)) {
      onChange(selectedClassIds.filter(id => id !== classId));
    } else {
      onChange([...selectedClassIds, classId]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Exam Name</Label>
          <Input 
            {...register("name", { required: "Name is required" })} 
            placeholder="e.g. Annual Examination 2026" 
            disabled={disabled || isSubmitting}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled || isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Exam Type</Label>
          <Controller
            control={control}
            name="examType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled || isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input 
            type="date"
            {...register("startDate", { required: "Start date is required" })} 
            disabled={disabled || isSubmitting}
          />
          {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Input 
            type="date"
            {...register("endDate", { required: "End date is required" })} 
            disabled={disabled || isSubmitting}
          />
          {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <Controller
          control={control}
          name="classIds"
          rules={{ required: "Select at least one class" }}
          render={({ field }) => {
            const currentSelected = field.value || [];
            const allSelected = classes.length > 0 && classes.every(c => c.id && currentSelected.includes(c.id));
            const handleToggleAll = (e: React.MouseEvent) => {
              e.preventDefault();
              if (disabled || isSubmitting) return;
              if (allSelected) {
                field.onChange([]);
              } else {
                field.onChange(classes.map(c => c.id!).filter(Boolean));
              }
            };

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-base font-semibold">Applicable Classes</Label>
                    <p className="text-xs text-muted-foreground">Select classes that will participate in this exam.</p>
                  </div>
                  {classes.length > 0 && !disabled && (
                    <div
                      onClick={handleToggleAll}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors select-none self-start sm:self-auto ${
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
                        ({currentSelected.length}/{classes.length})
                      </span>
                    </div>
                  )}
                </div>
                <div className="border rounded-md p-4 bg-muted/20">
                  <div className="flex flex-wrap gap-2">
                    {classes.map(cls => {
                      const isSelected = currentSelected.includes(cls.id!);
                      return (
                        <Badge 
                          key={cls.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer text-sm py-1 px-3"
                          onClick={() => !disabled && !isSubmitting && toggleClass(cls.id!, field.onChange)}
                        >
                          {cls.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          }}
        />
        {errors.classIds && <p className="text-sm text-red-500">{errors.classIds.message}</p>}
      </div>

      <div className="space-y-4 border rounded-md p-4 bg-muted/10">
        <div className="flex items-center space-x-2">
          <Controller
            control={control}
            name="includeCE"
            render={({ field }) => (
              <input
                type="checkbox"
                id="includeCE"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={disabled || isSubmitting}
                className="w-4 h-4 rounded border-gray-300"
              />
            )}
          />
          <Label htmlFor="includeCE" className="font-semibold cursor-pointer">Include Continuous Evaluation (CE) Marks</Label>
        </div>
        
        {includeCE && (
          <div className="pl-6 space-y-2">
            <Label>Maximum CE Marks</Label>
            <Input 
              type="number" 
              className="max-w-[200px]"
              {...register("maxCEMarks", { valueAsNumber: true, required: includeCE, min: 1 })} 
              disabled={disabled || isSubmitting}
            />
            {errors.maxCEMarks && <p className="text-sm text-red-500">{errors.maxCEMarks.message}</p>}
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (initialData ? "Update Exam" : "Create Exam")}
          </Button>
        </div>
      )}
    </form>
  );
}

// Ensure Badge is available, imported it above.
import { Badge } from "@/components/ui/badge";

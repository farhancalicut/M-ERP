"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { subjectSchema, SubjectFormData } from "../schemas/academicSchemas";
import { Class } from "@/types/schema";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SubjectFormProps {
  onSubmit: (data: SubjectFormData) => Promise<void>;
  classes: Class[];
  defaultValues?: Partial<SubjectFormData> | undefined;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function SubjectForm({ onSubmit, classes, defaultValues, isSubmitting, error }: SubjectFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      classIds: defaultValues?.classIds || [],
      defaultTotalMarks: defaultValues?.defaultTotalMarks ?? 100,
      defaultPassMarks: defaultValues?.defaultPassMarks ?? 40,
    }
  });

  const selectedClassIds = watch("classIds") || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormField label="Subject Name" required error={errors.name?.message as string | undefined}>
              <Input {...register("name")} placeholder="e.g. Mathematics" className="text-lg py-6" />
            </FormField>
          </div>

          <FormField label="Default Total Marks" required error={errors.defaultTotalMarks?.message as string | undefined}>
            <Input type="number" {...register("defaultTotalMarks", { valueAsNumber: true })} />
          </FormField>

          <FormField label="Default Pass Marks" required error={errors.defaultPassMarks?.message as string | undefined}>
            <Input type="number" {...register("defaultPassMarks", { valueAsNumber: true })} />
          </FormField>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label>Assigned Classes <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">Select classes that this subject applies to.</p>
            </div>
            {classes.length > 0 && (() => {
              const allSelected = classes.length > 0 && classes.every(c => c.id && selectedClassIds.includes(c.id));
              const handleToggleAll = () => {
                if (allSelected) {
                  setValue("classIds", []);
                } else {
                  setValue("classIds", classes.map(c => c.id!).filter(Boolean));
                }
              };
              return (
                <div
                  onClick={handleToggleAll}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors select-none self-start sm:self-auto",
                    allSelected
                      ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      : "bg-muted/50 border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                    allSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-700"
                  )}>
                    {allSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span>Mark All</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({selectedClassIds.length}/{classes.length})
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 max-h-60 overflow-y-auto">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">No classes available.</p>
            ) : (
              classes.map(cls => {
                const isSelected = selectedClassIds.includes(cls.id!);
                return (
                  <label 
                    key={cls.id} 
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue("classIds", [...selectedClassIds, cls.id!]);
                        } else {
                          setValue("classIds", selectedClassIds.filter((id: string) => id !== cls.id));
                        }
                      }}
                    />
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-700"
                    )}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm font-medium leading-none">{cls.name}</span>
                  </label>
                );
              })
            )}
          </div>
          {errors.classIds?.message && <p className="text-sm text-red-500">{errors.classIds.message as string}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? "Saving..." : "Save Subject"}
        </Button>
      </div>
    </form>
  );
}

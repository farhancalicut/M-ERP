"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { classSchema, ClassFormData } from "../schemas/academicSchemas";
import { STANDARD_CLASSES } from "@/constants/academic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { staffService } from "@/features/staff/services/staffService";
import { User } from "@/types/schema";
import { Controller } from "react-hook-form";

interface ClassFormProps {
  onSubmit: (data: ClassFormData) => Promise<void>;
  defaultValues?: Partial<ClassFormData> | undefined;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function ClassForm({ onSubmit, defaultValues, isSubmitting, error }: ClassFormProps) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema) as any,
    defaultValues: {
      globalClassId: defaultValues?.globalClassId || "",
      division: defaultValues?.division || "",
      displayOrder: defaultValues?.displayOrder ?? 0,
      isAlumni: defaultValues?.isAlumni ?? false,
      classTeacherId: defaultValues?.classTeacherId || undefined,
    }
  });

  const { userData } = useAuthStore();
  const [teachers, setTeachers] = useState<User[]>([]);
  
  useEffect(() => {
    async function loadTeachers() {
      if (userData?.madrassaId) {
        try {
          const staff = await staffService.getStaffMembers(userData.madrassaId);
          setTeachers(staff.filter(s => s.role === "TEACHER" || s.role === "PRINCIPAL"));
        } catch (error) {
          console.error("Failed to load teachers:", error);
        }
      }
    }
    loadTeachers();
  }, [userData?.madrassaId]);

  const isAlumni = watch("isAlumni");
  const globalClassId = watch("globalClassId");

  // Automatically update the display order when standard class changes
  useEffect(() => {
    if (globalClassId) {
      const stdClass = STANDARD_CLASSES.find(c => c.id === globalClassId);
      if (stdClass) {
        setValue("displayOrder", stdClass.defaultOrder, { shouldValidate: true });
      }
    }
  }, [globalClassId, setValue]);

  return (
    <form onSubmit={handleSubmit((data: any) => onSubmit(data as ClassFormData))} className="space-y-8">
      {error !== undefined && <FormError message={error} />}
      
      <FormSection title="Class Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Standard Class" required error={errors.globalClassId?.message as string | undefined}>
            <Controller
              name="globalClassId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_CLASSES.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          
          <FormField label="Division (Optional)" error={errors.division?.message as string | undefined}>
            <Input {...register("division")} placeholder="e.g. A, B, Boys" />
          </FormField>
        </div>
        
        <FormField label="Display Order (Promotion Order)" required error={errors.displayOrder?.message as string | undefined}>
          <Input type="number" {...register("displayOrder", { valueAsNumber: true })} disabled />
        </FormField>
        
        <FormField label="Class Teacher (Optional)" error={errors.classTeacherId?.message as string | undefined}>
            <Controller
              name="classTeacherId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(val) => field.onChange(val === "none" ? undefined : val)} 
                  value={field.value || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Teacher Assigned --</SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id as string}>{t.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
        </FormField>

        <div className="flex items-center space-x-2 pt-2">
          <Switch 
            id="isAlumni" 
            checked={isAlumni} 
            onCheckedChange={(val) => setValue("isAlumni", val)} 
          />
          <Label htmlFor="isAlumni">Is Alumni Class?</Label>
        </div>
        <p className="text-sm text-muted-foreground col-span-1 sm:col-span-2">
          Students promoted to an Alumni class will be graduated and moved to the Alumni registry.
        </p>
      </FormSection>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Class"}
        </Button>
      </div>
    </form>
  );
}

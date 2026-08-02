"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm as useHookForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { academicYearSchema, AcademicYearFormData } from "../schemas/academicSchemas";

interface AcademicYearFormProps {
  onSubmit: (data: AcademicYearFormData) => Promise<void>;
  defaultValues?: Partial<AcademicYearFormData>;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function AcademicYearForm({ onSubmit, defaultValues, isSubmitting, error }: AcademicYearFormProps) {
  const { register, handleSubmit, formState: { errors } } = useHookForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema) as any,
    defaultValues: {
      name: defaultValues?.name || "",
      ...(defaultValues?.startDate ? { startDate: new Date(defaultValues.startDate) } : {}),
      ...(defaultValues?.endDate ? { endDate: new Date(defaultValues.endDate) } : {}),
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}
      
      <FormSection title="Academic Year Details">
        <FormField label="Year Name (e.g. 2026-2027)" required error={errors.name?.message}>
          <Input {...register("name")} placeholder="2026-2027" />
        </FormField>
        
        <FormField label="Start Date" required error={errors.startDate?.message}>
          <Input type="date" {...register("startDate", { valueAsDate: true })} />
        </FormField>
        
        <FormField label="End Date" required error={errors.endDate?.message}>
          <Input type="date" {...register("endDate", { valueAsDate: true })} />
        </FormField>
      </FormSection>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Academic Year"}
        </Button>
      </div>
    </form>
  );
}

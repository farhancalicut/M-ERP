"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { subjectSchema, SubjectFormData } from "../schemas/academicSchemas";
import { Class } from "@/types/schema";

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
      code: defaultValues?.code || "",
      displayOrder: defaultValues?.displayOrder ?? 0,
      classIds: defaultValues?.classIds || [],
      defaultTotalMarks: defaultValues?.defaultTotalMarks ?? 100,
      defaultPassMarks: defaultValues?.defaultPassMarks ?? 40,
    }
  });

  const selectedClassIds = watch("classIds") || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}

      <FormSection title="Subject Details">
        <FormField label="Subject Name" required error={errors.name?.message as string | undefined}>
          <Input {...register("name")} placeholder="e.g. Mathematics" />
        </FormField>

        <FormField label="Subject Code" required error={errors.code?.message as string | undefined}>
          <Input {...register("code")} placeholder="e.g. MATH101" />
        </FormField>

        <FormField label="Display Order" required error={errors.displayOrder?.message as string | undefined}>
          <Input type="number" {...register("displayOrder", { valueAsNumber: true })} />
        </FormField>

        <FormField label="Default Total Marks" required error={errors.defaultTotalMarks?.message as string | undefined}>
          <Input type="number" {...register("defaultTotalMarks", { valueAsNumber: true })} />
        </FormField>

        <FormField label="Default Pass Marks" required error={errors.defaultPassMarks?.message as string | undefined}>
          <Input type="number" {...register("defaultPassMarks", { valueAsNumber: true })} />
        </FormField>

        <FormField label="Assigned Classes" error={errors.classIds?.message as string | undefined}>
          <div className="flex flex-col gap-2 p-2 border rounded-md max-h-48 overflow-y-auto">
            {classes.map(cls => (
              <label key={cls.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(cls.id!)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue("classIds", [...selectedClassIds, cls.id!]);
                    } else {
                      setValue("classIds", selectedClassIds.filter((id: string) => id !== cls.id));
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{cls.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Select classes that this subject applies to.</p>
        </FormField>
      </FormSection>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Subject"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parentEditSchema, ParentEditData } from "../schemas/parentSchema";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Parent } from "../types";
import { Loader2 } from "lucide-react";

interface ParentEditFormProps {
  initialData: Parent;
  onSubmit: (data: ParentEditData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | undefined;
  onCancel: () => void;
}

export function ParentEditForm({ initialData, onSubmit, isSubmitting, error, onCancel }: ParentEditFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ParentEditData>({
    resolver: zodResolver(parentEditSchema),
    defaultValues: {
      fatherName: initialData.fatherName,
      motherName: initialData.motherName,
      mobile: initialData.mobile,
      address: initialData.address,
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && <FormError message={error} />}
      
      <FormSection title="Guardian Information">
        <FormField label="Father's Name" required error={errors.fatherName?.message}>
          <Input {...register("fatherName")} />
        </FormField>
        
        <FormField label="Mother's Name" required error={errors.motherName?.message}>
          <Input {...register("motherName")} />
        </FormField>
        
        <FormField label="Mobile Number" required error={errors.mobile?.message}>
          <Input type="tel" {...register("mobile")} />
        </FormField>
        
        <FormField label="Address" required error={errors.address?.message} className="sm:col-span-2">
          <Textarea {...register("address")} className="resize-none" />
        </FormField>
      </FormSection>

      <div className="flex justify-end gap-4 pt-6 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}

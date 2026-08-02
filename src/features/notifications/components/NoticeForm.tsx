"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { noticeFormSchema, NoticeFormValues } from "../schemas/notificationSchemas";
import { Class, User } from "@/types/schema";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NoticeFormProps {
  onSubmit: (data: NoticeFormValues) => Promise<void>;
  onCancel?: () => void;
  classes?: Class[];
  students?: User[];
  defaultValues?: Partial<NoticeFormValues>;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function NoticeForm({ onSubmit, onCancel, classes = [], students = [], defaultValues, isSubmitting, error }: NoticeFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(noticeFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      attachments: defaultValues?.attachments || [],
      targetRoles: defaultValues?.targetRoles || [],
      targetClasses: defaultValues?.targetClasses || [],
      targetStudentIds: defaultValues?.targetStudentIds || [],
      expiryDate: defaultValues?.expiryDate ? new Date(defaultValues.expiryDate) : undefined,
      pinned: defaultValues?.pinned ?? false,
      status: defaultValues?.status || "DRAFT",
    }
  });

  const targetRoles = watch("targetRoles") || [];
  const targetClasses = watch("targetClasses") || [];
  const targetStudentIds = watch("targetStudentIds") || [];
  const pinned = watch("pinned") ?? false;

  const toggleArrayItem = (field: "targetRoles" | "targetClasses" | "targetStudentIds", currentArray: string[], item: string) => {
    if (currentArray.includes(item)) {
      setValue(field, currentArray.filter(i => i !== item));
    } else {
      setValue(field, [...currentArray, item]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}
      
      <FormSection title="Notice Details">
        <FormField label="Title" required error={errors.title?.message as string | undefined}>
          <Input {...register("title")} placeholder="Notice Title" />
        </FormField>
        
        <FormField label="Description" required error={errors.description?.message as string | undefined}>
          <Textarea {...register("description")} placeholder="Detailed content..." rows={5} />
        </FormField>

        <FormField label="Expiry Date" required error={errors.expiryDate?.message as string | undefined}>
          <Input type="date" {...register("expiryDate", { valueAsDate: true })} />
        </FormField>
        
        <div className="flex items-center space-x-2 pt-2">
          <Switch 
            id="pinned" 
            checked={pinned} 
            onCheckedChange={(val) => setValue("pinned", val)} 
          />
          <Label htmlFor="pinned">Pin Notice (Show at top of Notice Boards)</Label>
        </div>
      </FormSection>

      <FormSection title="Target Audience">
        <FormField label="Target Audience" required error={errors.targetRoles?.message as string | undefined}>
          <Select 
            value={targetRoles.length > 1 ? "ALL" : targetRoles[0] || ""} 
            onValueChange={(val) => {
              if (val === "ALL") {
                setValue("targetRoles", ['TEACHER', 'PARENT', 'ALUMNI']);
              } else {
                setValue("targetRoles", [val]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stakeholders</SelectItem>
              <SelectItem value="TEACHER">Teachers</SelectItem>
              <SelectItem value="PARENT">Parents</SelectItem>
              <SelectItem value="ALUMNI">Alumni</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        
        {classes.length > 0 && (
          <FormField label="Target Classes (Optional)" error={errors.targetClasses?.message as string | undefined}>
            <div className="flex flex-col gap-2 p-2 border rounded-md max-h-48 overflow-y-auto">
              {classes.map(cls => (
                <label key={cls.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={targetClasses.includes(cls.id!)}
                    onChange={() => toggleArrayItem("targetClasses", targetClasses, cls.id!)}
                  />
                  <span className="text-sm">{cls.name}</span>
                </label>
              ))}
            </div>
          </FormField>
        )}
      </FormSection>
      
      <div className="flex items-center space-x-2 pt-2 px-2">
        <Switch 
          id="isActive" 
          checked={watch("status") === "PUBLISHED"} 
          onCheckedChange={(val) => setValue("status", val ? "PUBLISHED" : "DRAFT")} 
        />
        <Label htmlFor="isActive">Notice is Active (Publish immediately)</Label>
      </div>

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel ? onCancel : () => window.history.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Notice"}
        </Button>
      </div>
    </form>
  );
}


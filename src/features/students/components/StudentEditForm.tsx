"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentEditSchema, StudentEditData } from "../schemas/studentSchema";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUpload } from "@/components/shared/CloudinaryUpload";
import { Class } from "@/types/schema";
import { Student } from "../types";
import { Loader2 } from "lucide-react";

interface StudentEditFormProps {
  initialData: Student;
  classes: Class[];
  onSubmit: (data: StudentEditData) => Promise<void>;
  isSubmitting?: boolean | undefined;
  error?: string | undefined;
  onCancel: () => void;
}

export function StudentEditForm({ initialData, classes, onSubmit, isSubmitting, error, onCancel }: StudentEditFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<StudentEditData>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: {
      name: initialData.name,
      gender: initialData.gender,
      dob: initialData.dob.toDate(),
      admissionDate: initialData.admissionDate.toDate(),
      bloodGroup: initialData.bloodGroup,
      classId: initialData.classId,
      address: initialData.address,
      photoUrl: initialData.photoUrl || "",
      medicalNotes: initialData.medicalNotes || "",
      identityMark: initialData.identityMark || "",
      majorAchievements: initialData.majorAchievements || "",
      guardianRelation: initialData.guardianRelation || "GUARDIAN",
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && <FormError message={error} />}
      
      <FormSection title="Student Photo">
        <div className="col-span-1 sm:col-span-2 flex justify-center">
          <CloudinaryUpload 
            onUpload={(url) => setValue("photoUrl", url)} 
            defaultImage={watch("photoUrl")}
          />
        </div>
      </FormSection>

      <FormSection title="Personal Information">
        <FormField label="Full Name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        
        <FormField label="Gender" required error={errors.gender?.message}>
          <Select value={watch("gender")} onValueChange={(val) => setValue("gender", val as "MALE" | "FEMALE", { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        
        <FormField label="Date of Birth" required error={errors.dob?.message}>
          <Input type="date" {...register("dob", { valueAsDate: true })} />
        </FormField>
        
        <FormField label="Blood Group" error={errors.bloodGroup?.message}>
          <Input {...register("bloodGroup")} />
        </FormField>

        <FormField label="Identity Mark" error={errors.identityMark?.message}>
          <Input {...register("identityMark")} />
        </FormField>

        <FormField label="Major Achievements" error={errors.majorAchievements?.message}>
          <Input {...register("majorAchievements")} />
        </FormField>

        <FormField label="Medical Notes" error={errors.medicalNotes?.message} className="sm:col-span-2">
          <Textarea {...register("medicalNotes")} className="resize-none" />
        </FormField>

        <FormField label="Address" required error={errors.address?.message} className="sm:col-span-2">
          <Textarea {...register("address")} className="resize-none" />
        </FormField>

        <FormField label="Guardian Relation" required error={errors.guardianRelation?.message}>
          <Select value={watch("guardianRelation")} onValueChange={(val) => setValue("guardianRelation", val as any, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FATHER">Father</SelectItem>
              <SelectItem value="MOTHER">Mother</SelectItem>
              <SelectItem value="GUARDIAN">Guardian</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Academic Information">
        <FormField label="Class" required error={errors.classId?.message}>
          <Select value={watch("classId")} onValueChange={(val) => setValue("classId", val, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id!}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        <FormField label="Admission Date" required error={errors.admissionDate?.message}>
          <Input type="date" {...register("admissionDate", { valueAsDate: true })} />
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

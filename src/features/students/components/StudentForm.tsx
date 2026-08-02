"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentAdmissionSchema, StudentAdmissionData } from "../schemas/studentSchema";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { FormActions } from "@/components/forms/FormActions";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudinaryUpload } from "@/components/shared/CloudinaryUpload";

interface StudentFormProps {
  onSubmit: (data: StudentAdmissionData) => Promise<void>;
  isSubmitting?: boolean | undefined;
  error?: string | undefined;
}

export function StudentForm({ onSubmit, isSubmitting, error }: StudentFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<StudentAdmissionData>({
    resolver: zodResolver(studentAdmissionSchema) as any,
    defaultValues: {
      photoUrl: "",
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}
      
      <FormSection title="Student Photo">
        <div className="col-span-1 sm:col-span-2 flex justify-center">
          <CloudinaryUpload 
            onUpload={(url) => setValue("photoUrl", url)} 
          />
        </div>
      </FormSection>

      <FormSection title="Personal Information">
        <FormField label="Full Name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        
        <FormField label="Gender" required error={errors.gender?.message}>
          <Select onValueChange={(val) => setValue("gender", val as "MALE" | "FEMALE")}>
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
      </FormSection>

      <FormSection title="Academic Information">
        <FormField label="Class" required error={errors.classId?.message}>
          <Input {...register("classId")} placeholder="Class ID for now" />
        </FormField>
        
        <FormField label="Admission Date" required error={errors.admissionDate?.message}>
          <Input type="date" {...register("admissionDate", { valueAsDate: true })} />
        </FormField>
      </FormSection>

      <FormSection title="Parent Information">
        <FormField label="Father's Name" required error={errors.fatherName?.message}>
          <Input {...register("fatherName")} />
        </FormField>
        <FormField label="Mother's Name" required error={errors.motherName?.message}>
          <Input {...register("motherName")} />
        </FormField>
        <FormField label="Guardian Relation" required error={errors.guardianRelation?.message}>
          <Select onValueChange={(val) => setValue("guardianRelation", val as "FATHER" | "MOTHER" | "GUARDIAN")}>
            <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FATHER">Father</SelectItem>
              <SelectItem value="MOTHER">Mother</SelectItem>
              <SelectItem value="GUARDIAN">Guardian</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Parent Mobile" required error={errors.parentMobile?.message}>
          <Input type="tel" {...register("parentMobile")} placeholder="e.g. 9876543210" />
        </FormField>
        <FormField label="Parent Email" required error={errors.parentEmail?.message}>
          <Input type="email" {...register("parentEmail")} placeholder="parent@example.com" />
        </FormField>
        <FormField label="Address" required error={errors.address?.message} className="sm:col-span-2">
          <Input {...register("address")} />
        </FormField>
      </FormSection>

      <FormActions>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Admit Student"}
        </Button>
      </FormActions>
    </form>
  );
}

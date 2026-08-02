"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { teacherAssignmentSchema, TeacherAssignmentFormData } from "../schemas/academicSchemas";
import { Class, Subject, User } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeacherAssignmentFormProps {
  onSubmit: (data: TeacherAssignmentFormData) => Promise<void>;
  teachers: User[];
  classes: Class[];
  subjects: Subject[];
  defaultValues?: Partial<TeacherAssignmentFormData>;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function TeacherAssignmentForm({ onSubmit, teachers, classes, subjects, defaultValues, isSubmitting, error }: TeacherAssignmentFormProps) {
  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<TeacherAssignmentFormData>({
    resolver: zodResolver(teacherAssignmentSchema),
    defaultValues: {
      teacherUid: defaultValues?.teacherUid || "",
      classIds: defaultValues?.classIds || [],
      subjectIds: defaultValues?.subjectIds || [],
    }
  });

  const selectedClassIds = watch("classIds") || [];
  const selectedSubjectIds = watch("subjectIds") || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error !== undefined && <FormError message={error} />}
      
      <FormSection title="Assignment Details">
        <FormField label="Teacher" required error={errors.teacherUid?.message}>
          <Select 
            value={watch("teacherUid")} 
            onValueChange={(val) => setValue("teacherUid", val, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map(teacher => (
                <SelectItem key={teacher.uid!} value={teacher.uid!}>
                  {teacher.displayName} ({teacher.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        <FormField label="Assigned Classes" error={errors.classIds?.message} required>
          <div className="flex flex-col gap-2 p-2 border rounded-md max-h-48 overflow-y-auto">
             {classes.map(cls => (
                <label key={cls.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={selectedClassIds.includes(cls.id!)}
                    onChange={(e) => {
                       if (e.target.checked) {
                          setValue("classIds", [...selectedClassIds, cls.id!], { shouldValidate: true });
                       } else {
                          setValue("classIds", selectedClassIds.filter(id => id !== cls.id), { shouldValidate: true });
                       }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{cls.name}</span>
                </label>
             ))}
          </div>
        </FormField>


      </FormSection>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </form>
  );
}

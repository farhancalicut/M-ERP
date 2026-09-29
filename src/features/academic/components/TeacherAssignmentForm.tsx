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
import { Check } from "lucide-react";

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
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-none">Assigned Classes <span className="text-red-500">*</span></span>
            {classes.length > 0 && (() => {
              const allClassesSelected = classes.length > 0 && classes.every(c => c.id && selectedClassIds.includes(c.id));
              const handleToggleAll = (e: React.MouseEvent) => {
                e.preventDefault();
                if (allClassesSelected) {
                  setValue("classIds", [], { shouldValidate: true });
                } else {
                  setValue("classIds", classes.map(c => c.id!).filter(Boolean), { shouldValidate: true });
                }
              };
              return (
                <div
                  onClick={handleToggleAll}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border transition-colors select-none cursor-pointer ${
                    allClassesSelected
                      ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      : "bg-muted/50 border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    allClassesSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-700 bg-background"
                  }`}>
                    {allClassesSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>Mark All ({selectedClassIds.length}/{classes.length})</span>
                </div>
              );
            })()}
          </div>
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
          {errors.classIds?.message && <p className="text-sm text-red-500">{errors.classIds.message}</p>}
        </div>


      </FormSection>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </form>
  );
}

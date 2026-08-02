"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { subjectService } from "@/features/academic/services/subjectService";
import { assignmentService } from "@/features/academic/services/assignmentService";
import { AssignmentFormValues } from "@/features/academic/schemas/academicSchemas";
import { AssignmentForm } from "@/features/academic/components/AssignmentForm";

export function AssignmentFormClient({ initialData, assignmentId }: { initialData?: any; assignmentId?: string }) {
  const router = useRouter();
  const { userData, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [initialDataState, setInitialDataState] = useState<any>(initialData);

  useEffect(() => {
    if ((userData as any)?.madrassaId && (userData as any)?.madrassa?.currentAcademicYear) {
      const fetchPromises: Promise<any>[] = [
        classService.getClasses((userData as any).madrassaId, (userData as any).madrassa.currentAcademicYear),
        subjectService.getSubjects((userData as any).madrassaId, (userData as any).madrassa.currentAcademicYear)
      ];

      if (assignmentId && !initialData) {
        fetchPromises.push(assignmentService.getAssignment(assignmentId));
      }

      Promise.all(fetchPromises).then((results) => {
        setClasses(results[0]);
        setSubjects(results[1]);
        if (results[2]) {
          setInitialDataState(results[2]);
        }
        setLoadingData(false);
      });
    }
  }, [userData, assignmentId, initialData]);

  const handleSubmit = async (data: AssignmentFormValues) => {
    if (!(userData as any)?.madrassaId || !user) return;
    try {
      setIsLoading(true);
      if (assignmentId) {
        await assignmentService.updateAssignment(assignmentId, data, user.uid);
        toast.success("Assignment updated successfully");
      } else {
        await assignmentService.createAssignment(
          (userData as any).madrassaId,
          (userData as any).madrassa.currentAcademicYear,
          data,
          user.uid
        );
        toast.success("Assignment created successfully");
      }
      router.push("/assignments");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save assignment");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) return <div>Loading...</div>;

  return (
    <AssignmentForm 
      initialData={initialDataState} 
      onSubmit={handleSubmit} 
      isLoading={isLoading} 
      classes={classes} 
      subjects={subjects} 
    />
  );
}

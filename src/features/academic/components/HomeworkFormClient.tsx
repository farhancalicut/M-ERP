"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { subjectService } from "@/features/academic/services/subjectService";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { HomeworkFormValues } from "@/features/academic/schemas/academicSchemas";
import { HomeworkForm } from "@/features/academic/components/HomeworkForm";

// Note: Ensure classService and subjectService exist or import them from where they actually are.
// I will need to check where classService is located.

export function HomeworkFormClient({ initialData, homeworkId }: { initialData?: any; homeworkId?: string }) {
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

      if (homeworkId && !initialData) {
        fetchPromises.push(homeworkService.getHomework(homeworkId));
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
  }, [userData, homeworkId, initialData]);

  const handleSubmit = async (data: HomeworkFormValues) => {
    if (!(userData as any)?.madrassaId || !user) return;
    try {
      setIsLoading(true);
      if (homeworkId) {
        await homeworkService.updateHomework(homeworkId, data, user.uid);
        toast.success("Homework updated successfully");
      } else {
        await homeworkService.createHomeworkWithYear(
          (userData as any).madrassaId,
          (userData as any).madrassa.currentAcademicYear,
          data,
          user.uid
        );
        toast.success("Homework created successfully");
      }
      router.push("/homework");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save homework");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) return <div>Loading...</div>;

  return (
    <HomeworkForm 
      initialData={initialDataState} 
      onSubmit={handleSubmit} 
      isLoading={isLoading} 
      classes={classes} 
      subjects={subjects} 
    />
  );
}

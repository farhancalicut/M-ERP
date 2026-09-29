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
  const { userData, user, currentAcademicYear } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [initialDataState, setInitialDataState] = useState<any>(initialData);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id) {
      const fetchPromises: Promise<any>[] = [
        classService.getClasses(userData.madrassaId, "ALL", undefined, 500),
        subjectService.getSubjects(userData.madrassaId, "ALL", undefined, 500)
      ];

      if (homeworkId && !initialData) {
        fetchPromises.push(homeworkService.getHomework(homeworkId));
      }

      Promise.all(fetchPromises).then((results) => {
        let fetchedClasses = results[0]?.classes || [];
        
        // Filter classes for TEACHER role to only assigned classes
        if (userData.role === "TEACHER") {
          const assignedIds = userData.assignedClassIds || [];
          fetchedClasses = fetchedClasses.filter((c: any) => c.id && assignedIds.includes(c.id));
        }

        setClasses(fetchedClasses);
        setSubjects(results[1]?.subjects || []);
        
        const loadedHomework = results[2] || initialData;
        if (loadedHomework) {
          setInitialDataState(loadedHomework);
          // If editing as a teacher, check if they are assigned to this homework's class
          if (userData.role === "TEACHER") {
            const assignedIds = userData.assignedClassIds || [];
            if (!assignedIds.includes(loadedHomework.classId)) {
              setPermissionError("You do not have permission to edit homework for this class.");
            }
          }
        }

        setLoadingData(false);
      }).catch((err) => {
        toast.error("Failed to load data");
        setLoadingData(false);
      });
    }
  }, [userData, homeworkId, initialData, currentAcademicYear]);

  const handleSubmit = async (data: HomeworkFormValues) => {
    if (!userData?.madrassaId || !user || !currentAcademicYear?.id) return;
    
    // UI-level permission check for TEACHER role
    if (userData.role === "TEACHER") {
      const assignedIds = userData.assignedClassIds || [];
      if (!assignedIds.includes(data.classId)) {
        toast.error("You are only permitted to create or update homework for your assigned classes.");
        return;
      }
    }

    try {
      setIsLoading(true);
      if (homeworkId) {
        await homeworkService.updateHomework(homeworkId, data, user.uid);
        toast.success("Homework updated successfully");
      } else {
        await homeworkService.createHomeworkWithYear(
          userData.madrassaId,
          currentAcademicYear.id,
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

  if (loadingData) return <div className="py-8 text-center text-sm text-muted-foreground">Loading form...</div>;

  if (permissionError) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-500 font-semibold">{permissionError}</div>
        <button
          onClick={() => router.push("/homework")}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Back to Homework List
        </button>
      </div>
    );
  }

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

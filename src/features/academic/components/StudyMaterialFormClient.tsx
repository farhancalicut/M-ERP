"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { subjectService } from "@/features/academic/services/subjectService";
import { studyMaterialService } from "@/features/academic/services/studyMaterialService";
import { StudyMaterialFormValues } from "@/features/academic/schemas/academicSchemas";
import { StudyMaterialForm } from "@/features/academic/components/StudyMaterialForm";

export function StudyMaterialFormClient({ initialData, materialId }: { initialData?: any; materialId?: string }) {
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

      if (materialId && !initialData) {
        fetchPromises.push(studyMaterialService.getMaterial(materialId));
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
  }, [userData, materialId, initialData]);

  const handleSubmit = async (data: StudyMaterialFormValues) => {
    if (!(userData as any)?.madrassaId || !user) return;
    try {
      setIsLoading(true);
      if (materialId) {
        await studyMaterialService.updateMaterial(materialId, data, user.uid);
        toast.success("Study Material updated successfully");
      } else {
        await studyMaterialService.createMaterial(
          (userData as any).madrassaId,
          (userData as any).madrassa.currentAcademicYear,
          data,
          user.uid
        );
        toast.success("Study Material created successfully");
      }
      router.push("/study-materials");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save study material");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) return <div>Loading...</div>;

  return (
    <StudyMaterialForm 
      initialData={initialDataState} 
      onSubmit={handleSubmit} 
      isLoading={isLoading} 
      classes={classes} 
      subjects={subjects} 
    />
  );
}

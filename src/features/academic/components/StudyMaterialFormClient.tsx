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
  const { userData, user, currentAcademicYear } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [initialDataState, setInitialDataState] = useState<any>(initialData);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id) {
      const fetchPromises: Promise<any>[] = [
        classService.getClasses(userData.madrassaId, "ALL", undefined, 500),
        subjectService.getSubjects(userData.madrassaId, "ALL", undefined, 500)
      ];

      if (materialId && !initialData) {
        fetchPromises.push(studyMaterialService.getMaterial(materialId));
      }

      Promise.all(fetchPromises).then((results) => {
        let fetchedClasses = results[0]?.classes || [];
        if (userData?.role === "TEACHER") {
          fetchedClasses = fetchedClasses.filter((c: any) => userData.assignedClassIds?.includes(c.id));
        }
        setClasses(fetchedClasses);
        setSubjects(results[1]?.subjects || []);
        if (results[2]) {
          setInitialDataState(results[2]);
        }
        setLoadingData(false);
      });
    }
  }, [userData, materialId, initialData, currentAcademicYear]);

  const handleSubmit = async (data: StudyMaterialFormValues) => {
    if (!userData?.madrassaId || !user || !currentAcademicYear?.id) return;
    try {
      setIsLoading(true);
      if (materialId) {
        await studyMaterialService.updateMaterial(materialId, data, user.uid);
        toast.success("Study material updated successfully");
      } else {
        await studyMaterialService.createMaterial(
          userData.madrassaId,
          currentAcademicYear.id,
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

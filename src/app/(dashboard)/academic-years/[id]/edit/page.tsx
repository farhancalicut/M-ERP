"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYearForm } from "@/features/academic/components/AcademicYearForm";
import { AcademicYearFormData } from "@/features/academic/schemas/academicSchemas";
import { toast } from "sonner";
import { Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { AcademicYear } from "@/types/schema";

export default function EditAcademicYearPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [initialData, setInitialData] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYear = async () => {
      try {
        const docRef = doc(db, "academicYears", params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInitialData({ id: docSnap.id, ...docSnap.data() } as AcademicYear);
        } else {
          toast.error("Academic year not found");
          router.push("/academic-years");
        }
      } catch {
        toast.error("Failed to load academic year");
      } finally {
        setLoading(false);
      }
    };
    fetchYear();
  }, [params.id, router]);

  const handleSubmit = async (data: AcademicYearFormData) => {
    if (!userData?.uid) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);
      
      await academicYearService.updateAcademicYear(params.id, {
        name: data.name,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
      }, userData.uid);
      
      toast.success("Academic year updated successfully");
      router.push("/academic-years");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to update academic year");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!initialData) return null;

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Academic Year</h1>
        <p className="text-muted-foreground">Update academic session details.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <AcademicYearForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
          defaultValues={{
            name: initialData.name,
            startDate: initialData.startDate.toDate(),
            endDate: initialData.endDate.toDate()
          }}
        />
      </div>
    </div>
  );
}

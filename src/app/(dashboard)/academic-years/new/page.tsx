"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYearForm } from "@/features/academic/components/AcademicYearForm";
import { AcademicYearFormData } from "@/features/academic/schemas/academicSchemas";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

export default function NewAcademicYearPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: AcademicYearFormData) => {
    if (!userData?.madrassaId) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);
      
      await academicYearService.createAcademicYear({
        madrassaId: userData.madrassaId,
        name: data.name,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        status: "UPCOMING",
        isCurrent: false,
      }, userData.uid);
      
      toast.success("Academic year created successfully");
      router.push("/academic-years");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to create academic year");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Academic Year</h1>
        <p className="text-muted-foreground">Create a new academic session.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <AcademicYearForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
}

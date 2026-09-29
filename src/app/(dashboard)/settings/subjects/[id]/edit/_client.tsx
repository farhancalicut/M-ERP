"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { subjectService } from "@/features/academic/services/subjectService";
import { classService } from "@/features/academic/services/classService";
import { SubjectForm } from "@/features/academic/components/SubjectForm";
import { SubjectFormData } from "@/features/academic/schemas/academicSchemas";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Subject, Class } from "@/types/schema";

export default function EditSubjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [initialData, setInitialData] = useState<Subject | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjectAndClasses = async () => {
      try {
        const docRef = doc(db, "subjects", params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const sub = { id: docSnap.id, ...docSnap.data() } as Subject;
          setInitialData(sub);

          if (userData?.madrassaId) {
             const res = await classService.getClasses(userData.madrassaId);
             setClasses(res.classes);
          }
        } else {
          toast.error("Subject not found");
          router.push("/settings/subjects");
        }
      } catch {
        toast.error("Failed to load subject");
      } finally {
        setLoading(false);
      }
    };
    fetchSubjectAndClasses();
  }, [params.id, router, userData?.madrassaId]);

  const handleSubmit = async (data: SubjectFormData) => {
    if (!userData?.uid) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);
      
      await subjectService.updateSubject(params.id, {
        name: data.name,
        code: data.code,
        displayOrder: data.displayOrder,
        classIds: data.classIds || [],
        defaultTotalMarks: data.defaultTotalMarks,
        defaultPassMarks: data.defaultPassMarks,
        // For uniqueness check
        madrassaId: initialData!.madrassaId,
      } as any, userData.uid);
      
      toast.success("Subject updated successfully");
      router.push("/settings/subjects");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to update subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!initialData) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Subject</h1>
        <p className="text-muted-foreground">Update subject settings.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <SubjectForm 
          onSubmit={handleSubmit}
          classes={classes}
          isSubmitting={isSubmitting}
          error={error}
          defaultValues={{
            name: initialData.name,
            code: initialData.code,
            displayOrder: initialData.displayOrder,
            classIds: initialData.classIds || [],
            defaultTotalMarks: initialData.defaultTotalMarks,
            defaultPassMarks: initialData.defaultPassMarks,
          }}
        />
      </div>
    </div>
  );
}

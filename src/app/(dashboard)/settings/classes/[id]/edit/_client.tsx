"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { classService } from "@/features/academic/services/classService";
import { ClassForm } from "@/features/academic/components/ClassForm";
import { ClassFormData } from "@/features/academic/schemas/academicSchemas";
import { toast } from "sonner";
import { doc, getDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Class } from "@/types/schema";

import { STANDARD_CLASSES } from "@/constants/academic";

export default function EditClassPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [initialData, setInitialData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const docRef = doc(db, "classes", params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInitialData({ id: docSnap.id, ...docSnap.data() } as Class);
        } else {
          toast.error("Class not found");
          router.push("/settings/classes");
        }
      } catch {
        toast.error("Failed to load class");
      } finally {
        setLoading(false);
      }
    };
    fetchClass();
  }, [params.id, router]);

  const handleSubmit = async (data: ClassFormData) => {
    if (!userData?.uid) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);
      
      const stdClass = STANDARD_CLASSES.find(c => c.id === data.globalClassId);
      if (!stdClass) {
        setError("Invalid standard class selected");
        return;
      }
      
      let computedName = stdClass.name;
      if (data.division && data.division.trim().length > 0) {
        computedName = `${stdClass.name} - ${data.division.trim().toUpperCase()}`;
      }
      
      const classData: Partial<Class> = {
        globalClassId: data.globalClassId,
        division: data.division || "",
        name: computedName,
        displayOrder: data.displayOrder,
        isAlumni: data.isAlumni || false,
        classTeacherId: data.classTeacherId || deleteField() as unknown as string,
        madrassaId: initialData!.madrassaId,
      };
      
      await classService.updateClass(params.id, classData, userData.uid);
      
      toast.success("Class updated successfully");
      router.push("/settings/classes");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to update class");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!initialData) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.push("/settings/classes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Class</h1>
        <p className="text-muted-foreground">Update class settings.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <ClassForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
          defaultValues={{
            globalClassId: initialData.globalClassId || "",
            division: initialData.division || "",
            displayOrder: initialData.displayOrder,
            isAlumni: initialData.isAlumni || false,
            classTeacherId: initialData.classTeacherId,
          }}
        />
      </div>
    </div>
  );
}

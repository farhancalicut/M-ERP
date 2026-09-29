"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamForm, ExamFormValues } from "@/features/exams/components/ExamForm";
import { examService } from "@/features/exams/services/examService";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";
import { Class, Exam } from "@/types/schema";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { subjectService } from "@/features/academic/services/subjectService";
import { ExamSubject } from "@/types/schema";

export default function EditExamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userData?.madrassaId) return;

    const loadFormData = async () => {
      try {
        setLoading(true);
        const examDoc = await examService.getExam(params.id);
        if (!examDoc || examDoc.madrassaId !== userData.madrassaId) {
          toast.error("Exam not found");
          router.push("/exams");
          return;
        }

        const clsRes = await classService.getClasses(userData.madrassaId, "ALL", undefined, 100);
        
        setExam(examDoc);
        setClasses(clsRes.classes);
      } catch (error: unknown) {
        toast.error("Failed to load exam data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadFormData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, params.id]);

  const handleSubmit = async (data: ExamFormValues) => {
    if (!userData?.madrassaId || !exam) return;
    try {
      setIsSubmitting(true);

      // Auto-populate classSubjects based on Master Subjects
      const { subjects: masterSubjects } = await subjectService.getSubjects(userData.madrassaId, "ACTIVE", undefined, 100);
      const classSubjects: Record<string, ExamSubject[]> = {};
      
      data.classIds.forEach(classId => {
        const applicable = masterSubjects.filter(sub => sub.classIds.includes(classId));
        classSubjects[classId] = applicable.map(sub => ({
          subjectName: sub.name,
          totalMarks: sub.defaultTotalMarks || 100,
          passMarks: sub.defaultPassMarks || 40
        }));
      });

      const examData: Partial<Exam> = {
        name: data.name,
        examType: data.examType as any,
        startDate: Timestamp.fromDate(parseISO(data.startDate)),
        endDate: Timestamp.fromDate(parseISO(data.endDate)),
        status: data.status,
        classIds: data.classIds,
        includeCE: data.includeCE,
        maxCEMarks: data.maxCEMarks,
        classSubjects
      };

      await examService.updateExam(exam.id as string, examData, userData.uid);
      toast.success("Exam updated successfully");
      router.push("/exams");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadonly = exam?.status === "ARCHIVED" || userData?.role === "TEACHER";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isReadonly ? "View Exam" : "Edit Exam"}
          </h1>
          <p className="text-muted-foreground">
            {isReadonly ? "Examination details (Read Only)" : "Modify examination details and subjects"}
          </p>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">Loading exam data...</div>
        ) : exam ? (
          <ExamForm 
            initialData={exam}
            classes={classes} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            disabled={isReadonly}
          />
        ) : (
          <div className="h-48 flex items-center justify-center">Exam not found.</div>
        )}
      </div>
    </div>
  );
}

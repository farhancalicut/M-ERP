"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamForm, ExamFormValues } from "@/features/exams/components/ExamForm";
import { examService } from "@/features/exams/services/examService";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";
import { Class, Exam, ExamSubject } from "@/types/schema";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { subjectService } from "@/features/academic/services/subjectService";

export default function NewExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearId = searchParams.get("yearId");
  const { userData } = useAuthStore();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userData?.madrassaId || !yearId) return;

    const loadFormData = async () => {
      try {
        setLoading(true);
        const clsRes = await classService.getClasses(userData.madrassaId, "ALL", undefined, 100);
        setClasses(clsRes.classes);
      } catch (error: unknown) {
        toast.error("Failed to load classes");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadFormData();
  }, [userData?.madrassaId, yearId]);

  const handleSubmit = async (data: ExamFormValues) => {
    if (!userData?.madrassaId || !yearId) return;
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

      const examData: Omit<Exam, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> = {
        madrassaId: userData.madrassaId,
        academicYearId: yearId,
        name: data.name,
        examType: data.examType as any,
        startDate: Timestamp.fromDate(parseISO(data.startDate)),
        endDate: Timestamp.fromDate(parseISO(data.endDate)),
        status: data.status,
        classIds: data.classIds,
        includeCE: data.includeCE,
        maxCEMarks: data.maxCEMarks,
        subjects: [], // Legacy array kept empty
        classSubjects
      };

      await examService.createExam(examData, userData.uid);
      toast.success("Exam created successfully");
      router.push("/exams");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!yearId) {
    return <div className="p-6">Error: No academic year selected.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Exam</h1>
          <p className="text-muted-foreground">Define examination details and configure subjects</p>
        </div>
      </div>

      {/* Exam form container */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">Loading form data...</div>
        ) : (
          <ExamForm 
            classes={classes} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
          />
        )}
      </div>
    </div>
  );
}

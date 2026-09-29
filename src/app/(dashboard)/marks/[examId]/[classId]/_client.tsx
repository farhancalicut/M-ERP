"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exam, Class, Mark } from "@/types/schema";
import { Student } from "@/features/students/types";
import { examService } from "@/features/exams/services/examService";
import { classService } from "@/features/academic/services/classService";
import { marksService } from "@/features/exams/services/marksService";
import { studentService } from "@/features/students/services/studentService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { MarksEntryForm } from "@/features/exams/components/MarksEntryForm";

export default function MarksEntryPage({ params }: { params: { examId: string; classId: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [markDoc, setMarkDoc] = useState<Mark | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userData?.madrassaId) return;

    try {
      setLoading(true);
      
      // Load Exam
      const examDoc = await examService.getExam(params.examId);
      if (!examDoc || examDoc.madrassaId !== userData.madrassaId) {
        toast.error("Exam not found");
        router.push("/marks");
        return;
      }
      
      // Load Class
      const classDoc = await classService.getClass(params.classId);
      if (!classDoc || classDoc.madrassaId !== userData.madrassaId) {
        toast.error("Class not found");
        router.push(`/marks/${params.examId}`);
        return;
      }

      // Teacher Access Check
      if (userData.role === "TEACHER") {
        if (!userData.assignedClassIds?.includes(params.classId)) {
          toast.error("You are not assigned to this class.");
          router.push(`/marks/${params.examId}`);
          return;
        }
      }

      // Initialize or load Mark Document (Transactional)
      const initializedMarkDoc = await marksService.initializeMarksDocument(examDoc, params.classId, userData.uid);

      // Load Students (But we only want to display the ones frozen in `studentIds` of the markDoc!)
      // To ensure no breakage if a student transferred, we load all students in the school, or we can use the batch student loading.
      // For Spark optimization, we load active students of this class, and if there are studentIds not in this list (transferred), 
      // we'd theoretically need to fetch them. For now, fetch active students of the class. 
      // The markDoc initialization already captures current active students.
      const studentRes = await studentService.searchStudents(userData.madrassaId, { classId: params.classId }, 500);
      
      // Filter strictly to the snapshot stored in `markDoc.studentIds`
      const snapStudents = studentRes.students.filter(s => initializedMarkDoc.studentIds.includes(s.studentId));

      setExam(examDoc);
      setCls(classDoc);
      setMarkDoc(initializedMarkDoc);
      setStudents(snapStudents);

    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load marks entry sheet.");
    } finally {
      setLoading(false);
    }
  }, [userData, params.examId, params.classId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading marks sheet...</div>;
  }

  if (!exam || !cls || !markDoc) return null;

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/marks/${exam.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Marks Entry - {cls.name}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{exam.name}</p>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-3 md:p-6">
        <MarksEntryForm 
          exam={exam}
          markDoc={markDoc}
          classId={cls.id as string}
          students={students}
          assignedSubjects={userData?.assignedSubjects}
          userRole={userData?.role || ""}
          uid={userData?.uid || ""}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}

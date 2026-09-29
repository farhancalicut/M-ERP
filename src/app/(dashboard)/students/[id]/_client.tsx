"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentProfile } from "@/features/students/components/StudentProfile";
import { studentService } from "@/features/students/services/studentService";
import { parentService } from "@/features/students/services/parentService";
import { Student, Parent } from "@/features/students/types";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { classService } from "@/features/academic/services/classService";
import { StudentAcademicRecords } from "@/features/students/components/StudentAcademicRecords";
import { useAuthStore } from "@/stores/authStore";

export default function StudentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userData, currentAcademicYear } = useAuthStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [className, setClassName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id === "string") {
      studentService.getStudent(id).then(async (data) => {
        setStudent(data);
        if (data) {
           if (data.classId) {
             const cls = await classService.getClass(data.classId);
             if (cls) setClassName(cls.name);
           }
           if (data.parentId) {
             const p = await parentService.getParent(data.parentId);
             setParent(p);
           }
        }
        setLoading(false);
      });
    }
  }, [id]);

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL", "TEACHER", "PARENT"]}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Student Details</h1>
        </div>
        {loading ? (
          <div className="py-8 text-muted-foreground">Loading student...</div>
        ) : student ? (
          <>
            <StudentProfile student={student} className={className} parent={parent} />
            {userData?.madrassaId && (
               <StudentAcademicRecords 
                 studentId={student.studentId}
                 madrassaId={userData.madrassaId}
                 academicYearId={currentAcademicYear?.id || ""}
                 currentClassId={student.classId}
               />
            )}
          </>
        ) : (
          <div className="py-8 text-muted-foreground">Student not found.</div>
        )}
      </div>
    </RoleGuard>
  );
}

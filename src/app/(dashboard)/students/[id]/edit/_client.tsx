"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentEditForm } from "@/features/students/components/StudentEditForm";
import { studentService } from "@/features/students/services/studentService";
import { classService } from "@/features/academic/services/classService";
import { Student } from "@/features/students/types";
import { Class } from "@/types/schema";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { useAuthStore } from "@/stores/authStore";
import { StudentEditData } from "@/features/students/schemas/studentSchema";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

export default function EditStudentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (typeof id === "string" && userData?.madrassaId) {
      Promise.all([
        studentService.getStudent(id),
        classService.getClasses(userData.madrassaId)
      ]).then(([studentData, classData]) => {
        setStudent(studentData);
        setClasses(classData.classes);
        setLoading(false);
      });
    }
  }, [id, userData?.madrassaId]);

  const handleSubmit = async (data: StudentEditData) => {
    if (!student || typeof id !== "string") return;
    
    setIsSubmitting(true);
    setError(undefined);
    try {
      await studentService.updateStudent(id, {
        name: data.name,
        nameSearch: data.name.toLowerCase(),
        gender: data.gender,
        dob: Timestamp.fromDate(data.dob),
        admissionDate: Timestamp.fromDate(data.admissionDate),
        bloodGroup: data.bloodGroup || "",
        classId: data.classId,
        address: data.address,
        photoUrl: data.photoUrl || "",
        medicalNotes: data.medicalNotes || "",
        identityMark: data.identityMark || "",
        majorAchievements: data.majorAchievements || "",
        guardianRelation: data.guardianRelation,
      });
      
      toast.success("Student updated successfully");
      router.push(`/students/${id}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL"]}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
          <p className="text-muted-foreground mt-1">Update student personal and academic details.</p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading student data...</div>
        ) : student ? (
          <div className="bg-card border rounded-xl p-6">
            <StudentEditForm 
              initialData={student} 
              classes={classes} 
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={error}
              onCancel={() => router.push(`/students/${id}`)}
            />
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Student not found.</div>
        )}
      </div>
    </RoleGuard>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { StudentProfile } from "@/features/students/components/StudentProfile";
import { studentService } from "@/features/students/services/studentService";
import { parentService } from "@/features/students/services/parentService";
import { Student, Parent } from "@/features/students/types";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { classService } from "@/features/academic/services/classService";

export default function StudentDetailsPage() {
  const { id } = useParams();
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
        <h1 className="text-3xl font-bold tracking-tight">Student Details</h1>
        {loading ? (
          <div className="py-8 text-muted-foreground">Loading student...</div>
        ) : student ? (
          <StudentProfile student={student} className={className} parent={parent} />
        ) : (
          <div className="py-8 text-muted-foreground">Student not found.</div>
        )}
      </div>
    </RoleGuard>
  );
}

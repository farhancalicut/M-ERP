"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentTable } from "@/features/students/components/StudentTable";
import { StudentFilters } from "@/features/students/components/StudentFilters";
import { studentService } from "@/features/students/services/studentService";
import { Student } from "@/features/students/types";
import { useAuthStore } from "@/stores/authStore";
import { RoleGuard } from "@/features/auth/components/RoleGuard";

import { classService } from "@/features/academic/services/classService";
import { Class } from "@/types/schema";
import { toast } from "sonner";

export default function StudentsPage() {
  const { userData } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // Note: For a robust implementation, startAfter cursor and fetching more logic goes here.

  const fetchStudents = useCallback(async (currentFilters: Record<string, string>) => {
    if (!userData?.madrassaId) return;
    setLoading(true);
    try {
      const [studentResult, classesResult] = await Promise.all([
        studentService.searchStudents(userData.madrassaId, currentFilters),
        classService.getClasses(userData.madrassaId)
      ]);
      setStudents(studentResult.students);
      setClasses(classesResult.classes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userData?.madrassaId]);

  useEffect(() => {
    fetchStudents(filters);
  }, [fetchStudents, filters]);

  const handleDelete = async (studentId: string) => {
    if (!userData?.id || !userData?.madrassaId) return;
    
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await studentService.softDeleteStudent(studentId, userData.id);
        toast.success("Student deleted successfully");
        fetchStudents(filters); // Refresh
      } catch (error: any) {
        toast.error("Failed to delete student");
      }
    }
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL", "TEACHER"]}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground mt-1">Manage and search enrolled students.</p>
          </div>
          {(userData?.role === 'MANAGEMENT' || userData?.role === 'PRINCIPAL') && (
            <Button asChild>
              <Link href="/students/new">
                <Plus className="mr-2 h-4 w-4" />
                New Admission
              </Link>
            </Button>
          )}
        </div>

        <StudentFilters onSearch={setFilters} />
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading students...</div>
        ) : (
          <StudentTable data={students} classes={classes} onDelete={handleDelete} />
        )}
      </div>
    </RoleGuard>
  );
}

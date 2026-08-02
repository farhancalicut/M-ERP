"use client";

import { useEffect, useState } from "react";
import { assignmentService } from "@/features/academic/services/assignmentService";
import { studentService } from "@/features/students/services/studentService";
import { ParentStudentSwitcher } from "@/components/shared/ParentStudentSwitcher";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { Student, AcademicAssignment } from "@/types/schema";
import { useAuth } from "@/hooks/useAuth";

export default function ParentAssignmentPage() {
  const { userData, currentAcademicYear } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId && userData?.role === "PARENT") {
      const parentIdentifier = (userData as any).domainId || (userData as any).uid || userData.id;
      studentService.getStudentsByParent(userData.madrassaId, parentIdentifier).then(myStudents => {
        setStudents(myStudents as Student[]);
        if (myStudents.length > 0) {
          setSelectedStudentId(myStudents[0]?.studentId || "");
        } else {
          setLoading(false);
        }
      });
    } else if (userData) {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (selectedStudentId && userData?.madrassaId && currentAcademicYear?.id) {
      setLoading(true);
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        assignmentService.getAssignments(
          userData.madrassaId, 
          currentAcademicYear.id,
          { classId: student.classId, status: "PUBLISHED" }
        ).then(res => {
          setAssignments(res.assignments as unknown as AcademicAssignment[]);
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      }
    }
  }, [selectedStudentId, students, userData, currentAcademicYear]);

  const columns = [
    {
      header: "Title",
      accessorKey: "title",
      cell: (row: any) => <div className="font-medium">{row.title}</div>
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (row: any) => row.dueDate ? new Date(row.dueDate.seconds * 1000).toLocaleDateString() : "-"
    },
    {
      header: "Action",
      id: "actions",
      cell: (row: any) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/parent/assignments/` + row.id}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Link>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            View offline assignments and projects for your children.
          </p>
        </div>
        <ParentStudentSwitcher 
          students={students} 
          selectedStudentId={selectedStudentId} 
          onStudentChange={setSelectedStudentId} 
          disabled={loading}
        />
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {students.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground">No active students found.</div>
        ) : (
          loading ? (
            <div className="h-48 flex justify-center items-center">Loading...</div>
          ) : (
            <DataTable
              columns={columns as any}
              data={assignments}
              searchKey="title"
              hideActions={true}
            />
          )
        )}
      </div>
    </div>
  );
}

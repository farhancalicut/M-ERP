"use client";

import { useEffect, useState } from "react";
import { studyMaterialService } from "@/features/academic/services/studyMaterialService";
import { studentService } from "@/features/students/services/studentService";
import { ParentStudentSwitcher } from "@/components/shared/ParentStudentSwitcher";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { Student, StudyMaterial } from "@/types/schema";
import { useAuth } from "@/hooks/useAuth";

export default function ParentStudyMaterialPage() {
  const { userData, currentAcademicYear } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
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
        studyMaterialService.getMaterials(
          userData.madrassaId, 
          currentAcademicYear.id,
          { classId: student.classId, status: "ACTIVE" }
        ).then(res => {
          setMaterials(res.materials as unknown as StudyMaterial[]);
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
      header: "Files",
      accessorKey: "files",
      cell: (row: any) => row.files?.length || 0
    },
    {
      header: "Action",
      id: "actions",
      cell: (row: any) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/parent/study-materials/` + row.id}>
            <Eye className="mr-2 h-4 w-4" /> View & Download
          </Link>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">
            Access learning resources and notes for your children.
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
              data={materials}
              searchKey="title"
              hideActions={true}
            />
          )
        )}
      </div>
    </div>
  );
}

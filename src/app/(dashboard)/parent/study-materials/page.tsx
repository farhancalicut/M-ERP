"use client";

import { useEffect, useState } from "react";
import { studyMaterialService } from "@/features/academic/services/studyMaterialService";
import { studentService } from "@/features/students/services/studentService";
import { classService } from "@/features/academic/services/classService";
import { questionPaperService } from "@/features/super-admin/services/questionPaperService";
import { ParentStudentSwitcher } from "@/components/shared/ParentStudentSwitcher";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Download } from "lucide-react";
import Link from "next/link";
import { Student, StudyMaterial, PlatformQuestionPaper } from "@/types/schema";
import { useAuth } from "@/hooks/useAuth";

export default function ParentStudyMaterialPage() {
  const { userData, currentAcademicYear, madrassa } = useAuth();
  
  // States for Students & Class Materials
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Question Papers
  const [questionPapers, setQuestionPapers] = useState<PlatformQuestionPaper[]>([]);
  const [qpLoading, setQpLoading] = useState(true);

  // 1. Fetch Students
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

  // 2. Fetch Study Materials for active student
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

  // 3. Fetch Question Papers globally by Madrassa's board AND student's global class
  useEffect(() => {
    if (madrassa?.board && selectedStudentId && userData?.madrassaId) {
      setQpLoading(true);
      const student = students.find(s => s.id === selectedStudentId);
      
      if (student) {
        // Fetch the student's local class to determine the global class ID
        classService.getClass(student.classId)
          .then(localClass => {
            if (localClass?.globalClassId) {
              return questionPaperService.getQuestionPapers(madrassa.board, localClass.globalClassId);
            }
            return []; // No global class mapping found for the student
          })
          .then(papers => {
            setQuestionPapers(papers as PlatformQuestionPaper[]);
            setQpLoading(false);
          })
          .catch(err => {
            console.error(err);
            setQpLoading(false);
          });
      }
    } else {
      setQpLoading(false);
    }
  }, [madrassa, selectedStudentId, students, userData]);

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

  const qpColumns = [
    {
      header: "Title",
      accessorKey: "title",
      cell: (row: any) => <div className="font-medium">{row.title}</div>
    },
    {
      header: "Class Level",
      accessorKey: "classLevel",
    },
    {
      header: "Subject",
      accessorKey: "subject",
    },
    {
      header: "Year",
      accessorKey: "year",
    },
    {
      header: "Action",
      id: "actions",
      cell: (row: any) => (
        <Button variant="outline" size="sm" asChild>
          <a href={row.fileUrl} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </a>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Resources</h1>
          <p className="text-muted-foreground">
            Access study materials and board question papers for your children.
          </p>
        </div>
        <ParentStudentSwitcher 
          students={students} 
          selectedStudentId={selectedStudentId} 
          onStudentChange={setSelectedStudentId} 
          disabled={loading}
        />
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="materials">Class Study Materials</TabsTrigger>
          <TabsTrigger value="question-papers">Board Question Papers</TabsTrigger>
        </TabsList>

        {/* STUDY MATERIALS TAB */}
        <TabsContent value="materials">
          <div className="bg-card border rounded-lg overflow-hidden">
            {students.length === 0 && !loading ? (
              <div className="p-8 text-center text-muted-foreground">No active students found.</div>
            ) : (
              loading ? (
                <div className="h-48 flex justify-center items-center">Loading class materials...</div>
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
        </TabsContent>

        {/* QUESTION PAPERS TAB */}
        <TabsContent value="question-papers">
          <div className="bg-card border rounded-lg overflow-hidden">
            {!madrassa?.board ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No educational board is configured for this madrassa.</p>
              </div>
            ) : qpLoading ? (
              <div className="h-48 flex justify-center items-center">Loading question papers...</div>
            ) : questionPapers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No question papers are currently available for your board ({madrassa.board}).</p>
              </div>
            ) : (
              <DataTable
                columns={qpColumns as any}
                data={questionPapers}
                searchKey="title"
                hideActions={true}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

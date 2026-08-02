"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Result, Exam } from "@/types/schema";
import { Student } from "@/features/students/types";
import { resultService } from "@/features/exams/services/resultService";
import { studentService } from "@/features/students/services/studentService";
import { examService } from "@/features/exams/services/examService";
import { subjectService } from "@/features/academic/services/subjectService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";
import { FileText } from "lucide-react";
import { format } from "date-fns";

export default function ParentResultsPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const [children, setChildren] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Maps to lookup quickly
  const [examMap, setExamMap] = useState<Record<string, Exam>>({});
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchYears = async () => {
      if (!userData?.madrassaId) return;
      try {
        const res = await academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50);
        setAcademicYears(res.years);
      } catch {}
    };
    fetchYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId]);

  useEffect(() => {
    if (!userData?.madrassaId || !selectedYearId || userData.role !== "PARENT") return;

    const loadParentData = async () => {
      try {
        setLoading(true);

        // 1. Get Parent's Children
        const studentsRef = await studentService.getParentStudents(userData.madrassaId, userData.uid);
        setChildren(studentsRef);

        const childIds = studentsRef.map(c => c.studentId);
        
        if (childIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch all published results for this year containing these children
        const publishedResults = await resultService.getStudentPublishedResults(userData.madrassaId, selectedYearId, childIds);
        setResults(publishedResults);

        // 3. Extract Exam IDs & Subject IDs to fetch details for rendering
        const examIds = Array.from(new Set(publishedResults.map(r => r.examId)));
        
        // Let's fetch the exams. In a real scenario with many exams, chunking is needed, but limit is usually fine for one year
        const examPromises = examIds.map(eid => examService.getExam(eid));
        const examDocs = (await Promise.all(examPromises)).filter(Boolean) as Exam[];
        
        const eMap: Record<string, Exam> = {};
        examDocs.forEach(e => { eMap[e.id!] = e; });
        setExamMap(eMap);

        // 4. Fetch subjects for mapping names
        const subRes = await subjectService.getSubjects(userData.madrassaId, "ALL", undefined, 100);
        const sMap: Record<string, string> = {};
        subRes.subjects.forEach(s => { sMap[s.id!] = s.name; });
        setSubjectMap(sMap);

      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };

    loadParentData();
  }, [userData, selectedYearId]);

  if (userData?.role !== "PARENT") return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Results</h1>
          <p className="text-muted-foreground">View examination performance for your children</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Academic Year:</span>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Academic Year" />
          </SelectTrigger>
          <SelectContent>
             {academicYears.map(yr => (
               <SelectItem key={yr.id!} value={yr.id!}>{yr.name}</SelectItem>
             ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">Loading results...</div>
      ) : children.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No children found linked to your account.
        </div>
      ) : results.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No published results found for your children in this academic year.
        </div>
      ) : (
        <div className="space-y-8">
          {children.map(child => {
            // Find all results for this specific child
            const childResults = results.filter(r => r.students[child.studentId]);
            
            if (childResults.length === 0) return null;

            return (
              <div key={child.studentId} className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2 flex items-center">
                   <FileText className="h-5 w-5 mr-2 text-primary" />
                   {child.name} <span className="text-muted-foreground text-sm ml-2 font-normal">({child.studentId})</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {childResults.map(result => {
                    const studentRes = result.students[child.studentId];
                    const exam = examMap[result.examId];
                    if (!exam || !studentRes) return null;

                    return (
                      <Card key={result.id}>
                        <CardHeader className="pb-3">
                           <div className="flex justify-between items-start">
                             <div>
                               <CardTitle className="text-lg">{exam.name}</CardTitle>
                               <CardDescription>{format(exam.startDate.toDate(), "MMM yyyy")} - {exam.examType}</CardDescription>
                             </div>
                             {studentRes.resultStatus === "PASS" ? (
                               <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">PASS</Badge>
                             ) : (
                               <Badge variant="destructive">FAIL</Badge>
                             )}
                           </div>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                             <div className="bg-muted/30 p-2 rounded">
                               <div className="text-xs text-muted-foreground">Marks</div>
                               <div className="font-bold text-lg">{studentRes.obtainedMarks} / {studentRes.totalMarks}</div>
                             </div>
                             <div className="bg-muted/30 p-2 rounded">
                               <div className="text-xs text-muted-foreground">Percentage</div>
                               <div className="font-bold text-lg">{studentRes.percentage}%</div>
                             </div>
                             <div className="bg-muted/30 p-2 rounded">
                               <div className="text-xs text-muted-foreground">Grade</div>
                               <div className="font-bold text-lg text-primary">{studentRes.grade}</div>
                             </div>
                           </div>

                           {studentRes.failedSubjects.length > 0 && (
                             <div className="mt-4 p-3 border rounded-md border-red-100 bg-red-50 text-red-900 text-sm">
                               <span className="font-semibold">Failed Subjects: </span>
                               {studentRes.failedSubjects.map(sid => subjectMap[sid] || sid).join(", ")}
                             </div>
                           )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

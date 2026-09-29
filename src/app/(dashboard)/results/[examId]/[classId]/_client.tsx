"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, FileBarChart, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exam, Class, Result, Mark } from "@/types/schema";
import { Student } from "@/features/students/types";
import { examService } from "@/features/exams/services/examService";
import { classService } from "@/features/academic/services/classService";
import { marksService } from "@/features/exams/services/marksService";
import { resultService } from "@/features/exams/services/resultService";
import { studentService } from "@/features/students/services/studentService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ResultsGenerationPage({ params }: { params: { examId: string; classId: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [resultDoc, setResultDoc] = useState<Result | null>(null);
  const [markDoc, setMarkDoc] = useState<Mark | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
    if (!userData?.madrassaId) return;

    try {
      setLoading(true);
      
      const examDoc = await examService.getExam(params.examId);
      if (!examDoc || examDoc.madrassaId !== userData.madrassaId) {
        toast.error("Exam not found");
        router.push("/results");
        return;
      }
      
      const classDoc = await classService.getClass(params.classId);
      if (!classDoc || classDoc.madrassaId !== userData.madrassaId) {
        toast.error("Class not found");
        router.push(`/results/${params.examId}`);
        return;
      }

      const resDoc = await resultService.getResults(params.examId, params.classId);
      const mDoc = await marksService.getMarks(params.examId, params.classId);

      // Load Students
      let studentList: Student[] = [];
      if (resDoc || mDoc) {
         // Either use resultDoc.students keys or markDoc.studentIds
         const targetStudentIds = resDoc ? Object.keys(resDoc.students) : mDoc?.studentIds || [];
         const studentRes = await studentService.searchStudents(userData.madrassaId, { classId: params.classId }, 500);
         studentList = studentRes.students.filter(s => targetStudentIds.includes(s.studentId));
      }

      setExam(examDoc);
      setCls(classDoc);
      setResultDoc(resDoc);
      setMarkDoc(mDoc);
      setStudents(studentList);

    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [userData, params.examId, params.classId, router]);

  useEffect(() => {
    loadData();
  }, [userData, loadData, router]);

  const handleGenerate = async () => {
    if (!userData) return;
    try {
      setIsProcessing(true);
      await resultService.generateResults(params.examId, params.classId, userData.uid);
      toast.success("Results generated successfully.");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate results.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!userData) return;
    if (!confirm("Are you sure you want to publish these results? Parents will be able to view them immediately.")) return;
    try {
      setIsProcessing(true);
      await resultService.publishResults(params.examId, params.classId, userData.uid);
      toast.success("Results published successfully.");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish results.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!userData) return;
    if (!confirm("Are you sure you want to unpublish these results?")) return;
    try {
      setIsProcessing(true);
      await resultService.unpublishResults(params.examId, params.classId, userData.uid);
      toast.success("Results unpublished successfully.");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unpublish results.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading results data...</div>;
  if (!exam || !cls) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/results/${exam.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results - {cls.name}</h1>
          <p className="text-muted-foreground">{exam.name}</p>
        </div>
      </div>

      {!resultDoc ? (
        <Card>
          <CardHeader>
             <CardTitle>Generate Results</CardTitle>
             <CardDescription>Results have not been generated for this class yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {markDoc ? (
               <div className="flex items-center gap-4">
                 <span>Marks Status: <Badge variant={markDoc.status === "LOCKED" ? "default" : "secondary"}>{markDoc.status}</Badge></span>
                 {markDoc.status === "LOCKED" ? (
                   <Button onClick={handleGenerate} disabled={isProcessing}>
                     <FileBarChart className="h-4 w-4 mr-2" /> Generate Now
                   </Button>
                 ) : (
                   <div className="text-sm text-red-600 font-medium">Marks must be LOCKED before generating results.</div>
                 )}
               </div>
             ) : (
               <div className="text-sm text-muted-foreground">Marks document has not been initialized for this class yet.</div>
             )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
             <div className="flex items-center gap-4">
               <div>
                 <div className="text-sm text-muted-foreground">Status</div>
                 <Badge variant={resultDoc.published ? "default" : "secondary"}>
                   {resultDoc.published ? "PUBLISHED" : "DRAFT (Not Visible)"}
                 </Badge>
               </div>
               <div className="pl-4 border-l">
                 <div className="text-sm text-muted-foreground">Pass Rate</div>
                 <div className="font-semibold text-green-700">{resultDoc.totalStudents > 0 ? ((resultDoc.passCount / resultDoc.totalStudents) * 100).toFixed(1) : 0}%</div>
               </div>
               <div className="pl-4 border-l">
                 <div className="text-sm text-muted-foreground">Passed / Failed</div>
                 <div className="font-semibold">{resultDoc.passCount} / {resultDoc.failCount}</div>
               </div>
             </div>
             <div className="flex gap-2">
               {resultDoc.published ? (
                  <Button variant="outline" onClick={handleUnpublish} disabled={isProcessing}>
                    <EyeOff className="h-4 w-4 mr-2" /> Unpublish
                  </Button>
               ) : (
                 <>
                   <Button variant="outline" onClick={handleGenerate} disabled={isProcessing}>
                     <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                   </Button>
                   <Button onClick={handlePublish} disabled={isProcessing}>
                     <Eye className="h-4 w-4 mr-2" /> Publish Results
                   </Button>
                 </>
               )}
             </div>
          </div>

          <div className="border rounded-lg overflow-x-auto bg-card text-card-foreground">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Obtained</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade (Pt)</TableHead>
                  <TableHead>Failed Subjects</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const res = resultDoc.students[student.studentId];
                  if (!res) return null;
                  return (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        {student.name}
                        <div className="text-xs text-muted-foreground">{student.studentId}</div>
                      </TableCell>
                      <TableCell>{res.totalMarks}</TableCell>
                      <TableCell>{res.obtainedMarks}</TableCell>
                      <TableCell>{res.percentage}%</TableCell>
                      <TableCell className="font-medium">
                        {res.grade} <span className="text-muted-foreground text-xs">({res.gradePoint})</span>
                      </TableCell>
                      <TableCell>
                         {res.failedSubjects.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                             {res.failedSubjects.map(subName => (
                               <Badge key={subName} variant="destructive" className="text-[10px] py-0">{subName}</Badge>
                             ))}
                           </div>
                         ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {res.resultStatus === "PASS" ? (
                            <div className="flex items-center text-green-700 font-medium">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Pass
                            </div>
                          ) : (
                            <div className="flex items-center text-red-700 font-medium">
                              <XCircle className="w-4 h-4 mr-1" /> Fail
                            </div>
                          )}
                          {res.isPromoted === true && (
                            <Badge className="w-fit bg-blue-600 hover:bg-blue-700 text-[10px]">
                              PROMOTED
                            </Badge>
                          )}
                          {res.isPromoted === false && (
                            <Badge variant="destructive" className="w-fit text-[10px]">
                              RETAINED
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

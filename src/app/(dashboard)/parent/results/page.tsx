"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Result, Exam, Mark } from "@/types/schema";
import { Student } from "@/features/students/types";
import { resultService } from "@/features/exams/services/resultService";
import { studentService } from "@/features/students/services/studentService";
import { examService } from "@/features/exams/services/examService";
import { marksService } from "@/features/exams/services/marksService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";
import { FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

function ResultCard({ result, exam, studentId }: { result: Result; exam: Exam; studentId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [markDoc, setMarkDoc] = useState<Mark | null | undefined>(undefined);
  const studentRes = result.students[studentId];
  if (!studentRes) return null;

  const isPassed = studentRes.resultStatus === "PASS";
  const activeSubjects = (exam.classSubjects?.[result.classId] || exam.subjects || []);

  const loadMarks = async () => {
    if (markDoc !== undefined) {
      setExpanded(e => !e);
      return;
    }
    try {
      const doc = await marksService.getMarks(exam.id!, result.classId);
      setMarkDoc(doc);
    } catch {
      setMarkDoc(null);
    }
    setExpanded(true);
  };

  const studentMarks = markDoc?.marks?.[studentId];

  return (
    <Card className={`border-l-4 ${isPassed ? "border-l-green-500" : "border-l-red-500"}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{exam.name}</CardTitle>
            <CardDescription>{format(exam.startDate.toDate(), "MMM yyyy")} · {exam.examType}</CardDescription>
          </div>
          {isPassed ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> PASS
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" /> FAIL
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Marks</p>
            <p className="font-bold text-sm">{studentRes.obtainedMarks} / {studentRes.totalMarks}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Percentage</p>
            <p className="font-bold text-sm">{studentRes.percentage}%</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Grade</p>
            <p className="font-bold text-sm text-primary">{studentRes.grade}</p>
          </div>
        </div>

        {studentRes.failedSubjects.length > 0 && (
          <div className="text-xs bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-2">
            <span className="font-semibold text-red-700 dark:text-red-400">Failed: </span>
            {studentRes.failedSubjects.join(", ")}
          </div>
        )}

        {activeSubjects.length > 0 && (
          <button onClick={loadMarks} className="text-xs text-primary flex items-center gap-1 hover:underline">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "View"} subject-wise marks
          </button>
        )}

        {expanded && activeSubjects.length > 0 && (
          <div className="space-y-1 mt-1">
            {activeSubjects.map((sub: any) => {
              const m = studentMarks?.[sub.subjectName];
              const isAbsent = m?.absent;
              const obtained = isAbsent ? "AB" : (m?.marksObtained ?? "—");
              const isFailed = studentRes.failedSubjects.includes(sub.subjectName);
              return (
                <div key={sub.subjectName}
                  className={`flex items-center justify-between px-2 py-1 rounded text-sm ${isFailed ? "bg-red-50 dark:bg-red-900/10" : "bg-muted/30"}`}>
                  <span className={`font-medium ${isFailed ? "text-red-700 dark:text-red-400" : ""}`}>{sub.subjectName}</span>
                  <span className={`font-bold text-xs ${isAbsent ? "text-amber-600" : isFailed ? "text-red-600" : "text-foreground"}`}>
                    {isAbsent ? "ABSENT" : `${obtained} / ${sub.totalMarks}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {studentRes.isPromoted === true && (
            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">PROMOTED TO NEXT CLASS</Badge>
          )}
          {studentRes.isPromoted === false && (
            <Badge variant="destructive" className="text-xs">RETAINED</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentResultsPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const [children, setChildren] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [examMap, setExamMap] = useState<Record<string, Exam>>({});
  const [loading, setLoading] = useState(true);

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
    const load = async () => {
      try {
        setLoading(true);
        const myChildren = await studentService.getParentStudents(userData.madrassaId, userData.uid);
        setChildren(myChildren);
        const childIds = myChildren.map((c: Student) => c.studentId);
        if (childIds.length === 0) { setLoading(false); return; }
        const publishedResults = await resultService.getStudentPublishedResults(userData.madrassaId, selectedYearId, childIds);
        setResults(publishedResults);
        const examIds = Array.from(new Set(publishedResults.map(r => r.examId)));
        const examDocs = (await Promise.all(examIds.map(id => examService.getExam(id)))).filter(Boolean) as Exam[];
        const eMap: Record<string, Exam> = {};
        examDocs.forEach(e => { eMap[e.id!] = e; });
        setExamMap(eMap);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, selectedYearId]);

  if (userData?.role !== "PARENT") return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Academic Results</h1>
        <p className="text-muted-foreground">View examination results for your children</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Academic Year:</span>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[240px]">
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
        <div className="h-48 flex items-center justify-center text-muted-foreground">Loading results...</div>
      ) : children.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No children found linked to your account.
        </div>
      ) : results.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No published results found for this academic year yet. Results will appear here once your school publishes them.
        </div>
      ) : (
        <div className="space-y-8">
          {children.map(child => {
            const childResults = results.filter(r => !!r.students[child.studentId]);
            if (childResults.length === 0) return null;
            return (
              <div key={child.studentId} className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {child.name}
                  <span className="text-muted-foreground text-sm font-normal">· {child.admissionNo}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {childResults
                    .filter(r => examMap[r.examId])
                    .sort((a, b) => {
                      const ea = examMap[a.examId]!;
                      const eb = examMap[b.examId]!;
                      return eb.startDate.toMillis() - ea.startDate.toMillis();
                    })
                    .map(result => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        exam={examMap[result.examId]!}
                        studentId={child.studentId}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
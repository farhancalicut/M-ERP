"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Exam } from "@/types/schema";
import { examService } from "@/features/exams/services/examService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, BookOpen, Calendar, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResultsDashboardPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const { userData, currentAcademicYear } = useAuthStore();
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const router = useRouter();

  useEffect(() => {
    if (userData?.role === "TEACHER") {
      toast.error("Teachers do not have access to result generation.");
      router.push("/teacher");
      return;
    }
  }, [userData, router]);

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

  const loadData = async () => {
    if (!userData?.madrassaId || !selectedYearId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await examService.getExams(userData.madrassaId, selectedYearId, "ALL", undefined, 50);
      setExams(res.exams.filter(e => e.status !== "ARCHIVED"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role !== "TEACHER") {
       loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, selectedYearId, userData?.role]);

  if (userData?.role === "TEACHER") return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results Generation</h1>
          <p className="text-muted-foreground">Select an exam to manage results</p>
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
               <SelectItem key={yr.id!} value={yr.id!}>{yr.name} ({yr.status})</SelectItem>
             ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No applicable exams found for this academic year.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <Card key={exam.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className={
                    exam.status === "ACTIVE" ? "bg-green-100 text-green-800" : 
                    exam.status === "COMPLETED" ? "bg-blue-100 text-blue-800" : 
                    "bg-gray-100 text-gray-800"
                  }>
                    {exam.status}
                  </Badge>
                  <Badge variant="outline">{exam.examType}</Badge>
                </div>
                <CardTitle className="text-xl">{exam.name}</CardTitle>
                <CardDescription>
                  <Calendar className="inline-block w-3 h-3 mr-1" />
                  {format(exam.startDate.toDate(), "MMM d, yyyy")} - {format(exam.endDate.toDate(), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {exam.classIds.length} Classes Applicable
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {exam.subjects.length} Subjects
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Link href={`/results/${exam.id}`} className="w-full">
                  <Button className="w-full" variant={exam.status === "COMPLETED" || exam.status === "ACTIVE" ? "default" : "secondary"}>
                    Select Classes <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

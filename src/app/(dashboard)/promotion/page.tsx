"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { classService } from "@/features/academic/services/classService";
import { examService } from "@/features/exams/services/examService";
import { AcademicYear, Class, Exam } from "@/types/schema";

const formSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required"),
  classId: z.string().min(1, "Class is required"),
  examId: z.string().min(1, "Final Exam is required")
});

export default function PromotionSelectionPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicYearId: "",
      classId: "",
      examId: ""
    }
  });

  const selectedYear = watch("academicYearId");
  const selectedClass = watch("classId");

  useEffect(() => {
    if (!madrassaId) return;
    academicYearService.getAcademicYears(madrassaId, "ALL").then(res => setAcademicYears(res.years));
  }, [madrassaId]);

  useEffect(() => {
    if (!madrassaId || !selectedYear) return;
    classService.getClasses(madrassaId, "ACTIVE").then(res => setClasses(res.classes));
  }, [madrassaId, selectedYear]);

  useEffect(() => {
    if (!madrassaId || !selectedYear || !selectedClass) return;
    // Load exams for this class
    examService.getExams(madrassaId, selectedYear, undefined, undefined, 100).then(res => {
       const classExams = res.exams.filter(e => e.classIds.includes(selectedClass) && e.status === "COMPLETED");
       setExams(classExams);
    });
  }, [madrassaId, selectedYear, selectedClass]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    router.push(`/promotion/${data.classId}?examId=${data.examId}&academicYearId=${data.academicYearId}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Initiate Promotion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Academic Year</label>
              <Controller
                control={control}
                name="academicYearId"
                render={({ field }) => (
                  <Select onValueChange={(val) => { field.onChange(val); setValue("classId", ""); setValue("examId", ""); }} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                    <SelectContent>
                      {academicYears.map(ay => (
                        <SelectItem key={ay.id!} value={ay.id!}>{ay.name} ({ay.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source Class</label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select onValueChange={(val) => { field.onChange(val); setValue("examId", ""); }} value={field.value} disabled={!selectedYear}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Final Exam (For Results)</label>
              <Controller
                control={control}
                name="examId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClass}>
                    <SelectTrigger><SelectValue placeholder="Select Completed Exam" /></SelectTrigger>
                    <SelectContent>
                      {exams.length === 0 && <SelectItem value="none" disabled>No completed exams found</SelectItem>}
                      {exams.map(e => (
                        <SelectItem key={e.id!} value={e.id!}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                View Candidates
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

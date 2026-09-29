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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { promotionService } from "@/features/promotion/services/promotionService";
import { AcademicYear, Class, Exam, Promotion } from "@/types/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArchiveRestore, CheckCircle2, RotateCcw } from "lucide-react";

const formSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required"),
  classId: z.string().min(1, "Class is required"),
  examId: z.string().min(1, "A completed Final Exam is required for this class")
});

export default function PromotionSelectionPage() {
  const router = useRouter();
  const { userData, currentAcademicYear } = useAuthStore();
  const madrassaId = userData?.madrassaId;

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicYearId: currentAcademicYear?.id || "",
      classId: "",
      examId: ""
    }
  });

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const loadPromotions = async () => {
    if (!madrassaId) return;
    setLoadingPromotions(true);
    try {
      const res = await promotionService.getPromotionHistory(madrassaId);
      setPromotions(res.promotions);
    } catch(e) { console.error(e); }
    setLoadingPromotions(false);
  };
  
  useEffect(() => { loadPromotions(); }, [madrassaId]);

  const handleRollback = async (id: string) => {
    if (!confirm("Are you sure you want to rollback this promotion? This action is irreversible.")) return;
    setRollingBack(id);
    try {
      await promotionService.validateRollbackAllowed(id);
      await promotionService.rollbackPromotion(id, userData!.uid);
      toast.success("Promotion successfully rolled back");
      await loadPromotions();
    } catch (e: any) {
      toast.error(e.message || "Failed to rollback promotion");
    } finally {
      setRollingBack(null);
    }
  };

  useEffect(() => {
    if (currentAcademicYear?.id && !watch("academicYearId")) {
      setValue("academicYearId", currentAcademicYear.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAcademicYear?.id]);

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

  const finalExam = exams.find(e => e.examType === "Final");

  useEffect(() => {
    if (!madrassaId || !selectedYear || !selectedClass) {
      setExams([]);
      setValue("examId", "");
      return;
    }
    // Load exams for this class
    examService.getExams(madrassaId, selectedYear, undefined, undefined, 100).then(res => {
       const classExams = res.exams.filter(e => e.classIds.includes(selectedClass) && e.status === "COMPLETED");
       setExams(classExams);
       
       const foundFinal = classExams.find(e => e.examType === "Final");
       if (foundFinal) {
         setValue("examId", foundFinal.id!);
       } else {
         setValue("examId", "");
       }
    });
  }, [madrassaId, selectedYear, selectedClass, setValue]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    router.push(`/promotion/${data.classId}?examId=${data.examId}&academicYearId=${data.academicYearId}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Promotions & Alumni</h1>
        <p className="text-muted-foreground text-sm mt-1">Initiate end-of-year promotions or view past promotion history.</p>
      </div>

      <Tabs defaultValue="initiate">
        <TabsList className="mb-6">
          <TabsTrigger value="initiate">Initiate Promotion</TabsTrigger>
          <TabsTrigger value="history">Promotion History</TabsTrigger>
        </TabsList>

        <TabsContent value="initiate">
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

            {selectedClass && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <label className="text-sm font-medium">Final Exam</label>
                {finalExam ? (
                  <div className="text-sm font-semibold text-primary flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    {finalExam.name} (Auto-selected)
                  </div>
                ) : (
                  <div className="text-sm text-destructive">
                    No completed Final Exam found for this class in the selected academic year.
                  </div>
                )}
                {/* Hidden input to register the value */}
                <input type="hidden" {...control.register("examId")} />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                View Candidates
              </Button>
            </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPromotions ? (
                <div className="py-8 text-center text-muted-foreground">Loading history...</div>
              ) : promotions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ArchiveRestore className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No promotion history found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Total Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map(p => {
                      const fromCls = classes.find(c => c.id === p.fromClassId)?.name || "Unknown Class";
                      const toCls = p.toClassId ? classes.find(c => c.id === p.toClassId)?.name || "Unknown Class" : "None";
                      const dateStr = (p.processedAt as any)?.toDate ? format((p.processedAt as any).toDate(), "dd MMM yyyy, hh:mm a") : "-";
                      
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{dateStr}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{fromCls}</div>
                            <div className="text-xs text-muted-foreground">Promoted to: {toCls}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-semibold">{p.totalStudents}</span>
                            <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                              <span>P: {p.promotedCount}</span>
                              <span>D: {p.detainedCount}</span>
                              <span>A: {p.alumniCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.status === "COMPLETED" ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1"/> Completed</Badge>
                            ) : (
                              <Badge variant="destructive"><RotateCcw className="h-3 w-3 mr-1"/> Rolled Back</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.status === "COMPLETED" && (
                              <Button variant="outline" size="sm" onClick={() => handleRollback(p.id!)} disabled={rollingBack === p.id}>
                                {rollingBack === p.id ? "Rolling back..." : "Rollback"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

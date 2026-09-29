"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { PromotionPayload, promotionService } from "@/features/promotion/services/promotionService";
import { classService } from "@/features/academic/services/classService";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear, Class } from "@/types/schema";
import { PromotionTable } from "@/features/promotion/components/PromotionTable";
import { PromotionSummaryCard } from "@/features/promotion/components/PromotionSummaryCard";
import { PromotionConfirmationDialog } from "@/features/promotion/components/PromotionConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { PromotionStudent } from "@/types/schema";

export default function PromotionExecutionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userData } = useAuthStore();

  const classId = params.classId as string;
  const examId = searchParams.get("examId");
  const academicYearId = searchParams.get("academicYearId"); // source academic year

  const [loading, setLoading] = useState(true);
  const [sourceClass, setSourceClass] = useState<Class | null>(null);
  const [isHighestClass, setIsHighestClass] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [targetClasses, setTargetClasses] = useState<Class[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payload, setPayload] = useState<PromotionPayload | null>(null);

  const { control, handleSubmit, watch, setValue } = useForm<{
    nextAcademicYearId: string;
    toClassId: string;
    students: PromotionStudent[];
  }>({
    defaultValues: {
      nextAcademicYearId: "",
      toClassId: "",
      students: []
    }
  });

  useFieldArray({
    control,
    name: "students"
  });

  const watchNextAy = watch("nextAcademicYearId");
  const watchStudents = watch("students");

  useEffect(() => {
    if (!userData || !classId || !examId || !academicYearId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // Load source class
        const c = await classService.getClass(classId);
        if (!c) throw new Error("Source class not found");
        setSourceClass(c);

        // Load all classes to find highest (by displayOrder)
        const classesRes = await classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100);
        let computedIsHighest = false;
        if (classesRes.classes.length > 0) {
          const sorted = [...classesRes.classes].sort((a, b) => b.displayOrder - a.displayOrder);
          const topClass = sorted[0];
          // Use local variable — do NOT rely on state (async, not set yet)
          computedIsHighest = topClass?.id === classId;
          setIsHighestClass(computedIsHighest);
        }

        // Load candidates using the locally computed isHighestClass
        const candidates = await promotionService.getPromotionCandidates(userData.madrassaId, classId, examId, computedIsHighest);
        setValue("students", candidates);

        // Load ALL academic years — user picks the next one; filter source year in UI
        const ayRes = await academicYearService.getAcademicYears(userData.madrassaId, "ALL");
        setAcademicYears(ayRes.years);

      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error loading candidates");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, classId, examId, academicYearId]);

  useEffect(() => {
    if (!userData || !watchNextAy) return;
    classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100)
      .then(res => setTargetClasses(res.classes));
  }, [userData, watchNextAy]);

  const isHighestClassWatch = isHighestClass;
  const requiresDestinationClass = watchStudents.some(s => s.action === "PROMOTED");

  const onSubmit = (data: { nextAcademicYearId: string; toClassId: string; students: PromotionStudent[] }) => {
    if (requiresDestinationClass && !data.toClassId) {
      toast.error("Destination class is required for promoted students.");
      return;
    }
    if (!data.nextAcademicYearId) {
      toast.error("Next Academic Year is required.");
      return;
    }

    const payloadToSet: PromotionPayload = {
      madrassaId: userData!.madrassaId,
      academicYearId: academicYearId as string,
      nextAcademicYearId: data.nextAcademicYearId,
      fromClassId: classId,
      students: data.students,
      processedByUid: userData!.uid
    };
    if (data.toClassId) {
      payloadToSet.toClassId = data.toClassId;
    }
    setPayload(payloadToSet);
    setConfirmOpen(true);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promote: {sourceClass?.name}</h1>
        <p className="text-muted-foreground">Select the destination settings and adjust individual student actions if needed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
        <div>
          <label className="text-sm font-medium mb-1 block">Next Academic Year</label>
          <Controller
            control={control}
            name="nextAcademicYearId"
            render={({ field }) => (
              <Select onValueChange={(val) => { field.onChange(val); setValue("toClassId", ""); }} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select Upcoming Year" /></SelectTrigger>
                <SelectContent>
          {/* Exclude the source academic year from next year options */}
          {academicYears
            .filter(ay => ay.id !== academicYearId)
            .map(ay => (
              <SelectItem key={ay.id!} value={ay.id!}>{ay.name} ({ay.status})</SelectItem>
            ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Destination Class</label>
          <Controller
            control={control}
            name="toClassId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={!watchNextAy || !requiresDestinationClass}>
                <SelectTrigger><SelectValue placeholder={requiresDestinationClass ? "Select Next Class" : "Not Required (All Alumni/Detained)"} /></SelectTrigger>
                <SelectContent>
                  {targetClasses.map(c => (
                    <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <PromotionSummaryCard students={watchStudents} />

      <PromotionTable 
        fields={watchStudents} 
        // @ts-expect-error - react-hook-form control type mismatch
        control={control} 
        setValue={setValue} 
        isHighestClass={isHighestClassWatch}
      />

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => router.push("/promotion")}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit)}>Review & Submit</Button>
      </div>

      <PromotionConfirmationDialog 
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        payload={payload}
      />
    </div>
  );
}

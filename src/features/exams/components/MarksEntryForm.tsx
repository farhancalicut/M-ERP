"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Exam, Mark } from "@/types/schema";
import { Student } from "@/features/students/types";
import { marksService } from "@/features/exams/services/marksService";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, Lock, Unlock, Send } from "lucide-react";

interface MarksEntryFormProps {
  exam: Exam;
  markDoc: Mark;
  classId: string;
  students: Student[];
  assignedSubjects: string[] | undefined; 
  userRole: string;
  uid: string;
  onRefresh: () => void;
}

export function MarksEntryForm({ exam, markDoc, classId, students, assignedSubjects, userRole, uid, onRefresh }: MarksEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPrincipal = userRole === "PRINCIPAL" || userRole === "MANAGEMENT" || userRole === "SUPER_ADMIN";
  const isLocked = markDoc.locked;
  const isSubmitted = markDoc.submitted;
  
  const canEdit = marksService.canEditMarks(markDoc, userRole);

  const activeSubjects = exam.classSubjects?.[classId] || exam.subjects || [];

  const { register, control, handleSubmit, watch, setValue, getValues, formState: { isDirty } } = useForm({
    defaultValues: {
      marks: markDoc.marks
    }
  });

  const canEditCell = (subjectName: string) => {
    return canEdit;
  };

  const handleSaveDraft = async (data: { marks: Mark["marks"] }) => {
    try {
      setIsSubmitting(true);
      if (isPrincipal) {
        await marksService.updateMarks(exam.id as string, classId, data.marks, uid);
      } else {
        await marksService.saveDraft(exam.id as string, classId, data.marks, uid);
      }
      toast.success("Marks draft saved successfully.");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMarks = async () => {
    if (!confirm("Are you sure you want to submit these marks? Teachers cannot edit after submission.")) return;
    try {
      setIsSubmitting(true);
      const currentData = getValues();
      await marksService.saveDraft(exam.id as string, classId, currentData.marks, uid);
      await marksService.submitMarks(exam.id as string, classId, currentData.marks, uid);
      toast.success("Marks submitted successfully.");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit marks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!confirm("Are you sure you want to lock these marks? No one can edit them after locking, and they will be ready for result generation.")) return;
    try {
      setIsSubmitting(true);
      await marksService.lockMarks(exam.id as string, classId, uid);
      toast.success("Marks locked successfully.");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to lock marks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    if (!confirm("Are you sure you want to unlock these marks?")) return;
    try {
      setIsSubmitting(true);
      await marksService.unlockMarks(exam.id as string, classId, uid);
      toast.success("Marks unlocked successfully.");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unlock marks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const marksData = watch("marks");

  const enforceMaxMarks = (studentId: string, subjectName: string, maxMarks: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    if (num > maxMarks) {
      toast.error(`Marks cannot exceed ${maxMarks}`);
      setValue(`marks.${studentId}.${subjectName}.marksObtained`, maxMarks, { shouldDirty: true });
    } else if (num < 0) {
      setValue(`marks.${studentId}.${subjectName}.marksObtained`, 0, { shouldDirty: true });
    }
  };

  const enforceMaxCEMarks = (studentId: string, subjectName: string, maxCEMarks: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    if (num > maxCEMarks) {
      toast.error(`CE Marks cannot exceed ${maxCEMarks}`);
      setValue(`marks.${studentId}.${subjectName}.ceMarksObtained`, maxCEMarks, { shouldDirty: true });
    } else if (num < 0) {
      setValue(`marks.${studentId}.${subjectName}.ceMarksObtained`, 0, { shouldDirty: true });
    }
  };

  const handleAbsentToggle = (studentId: string, subjectName: string, isAbsent: boolean) => {
    if (isAbsent) {
      setValue(`marks.${studentId}.${subjectName}.marksObtained`, null as unknown as number, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Status:</span>
          <Badge variant={isLocked ? "destructive" : isSubmitted ? "default" : "secondary"}>
            {markDoc.status}
          </Badge>
          {isDirty && <span className="text-sm text-amber-600 font-medium ml-2">* Unsaved changes</span>}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={handleSubmit(handleSaveDraft)} disabled={isSubmitting || (!isDirty && !isPrincipal)}>
                <Save className="h-4 w-4 mr-2" /> Save Draft
              </Button>
              <Button size="sm" onClick={handleSubmitMarks} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" /> Submit Marks
              </Button>
            </>
          )}
          {isPrincipal && !isLocked && (
             <Button size="sm" variant="destructive" onClick={handleLock} disabled={isSubmitting}>
               <Lock className="h-4 w-4 mr-2" /> Lock Marks
             </Button>
          )}
          {isPrincipal && isLocked && (
             <Button size="sm" variant="outline" onClick={handleUnlock} disabled={isSubmitting}>
               <Unlock className="h-4 w-4 mr-2" /> Unlock Marks
             </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto relative w-full shadow-sm">
        <Table className="w-full min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] md:w-[200px] sticky left-0 bg-card text-card-foreground shadow-[1px_0_0_0_#e5e7eb] z-10 px-2 md:px-4">Student</TableHead>
              {activeSubjects.map(examSub => {
                return (
                  <TableHead key={examSub.subjectName} className="min-w-[180px] md:min-w-[250px] px-2 md:px-4 border-l">
                    <div className="font-semibold text-sm md:text-base truncate" title={examSub.subjectName}>{examSub.subjectName}</div>
                    <div className="text-[10px] md:text-xs font-normal text-muted-foreground whitespace-nowrap">Max: {examSub.totalMarks} | Pass: {examSub.passMarks} {exam.includeCE && `| CE Max: ${exam.maxCEMarks}`}</div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.studentId}>
                <TableCell className="sticky left-0 bg-card text-card-foreground shadow-[1px_0_0_0_#e5e7eb] z-10 font-medium px-2 md:px-4 max-w-[120px] md:max-w-[200px]">
                  <div className="truncate" title={student.name}>{student.name}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground truncate" title={student.studentId}>{student.studentId}</div>
                </TableCell>
                {activeSubjects.map(examSub => {
                  const subName = examSub.subjectName;
                  const editable = canEditCell(subName);
                  const maxMarks = examSub.totalMarks || 100;
                  const isAbsent = marksData?.[student.studentId]?.[subName]?.absent;
                  
                  return (
                    <TableCell key={subName} className="bg-muted/5 border-l px-2 md:px-4">
                      <div className="flex flex-col md:flex-row items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            className="w-14 h-8 text-center px-1"
                            placeholder="-"
                            disabled={!editable || isAbsent}
                            {...register(`marks.${student.studentId}.${subName}.marksObtained`, {
                              valueAsNumber: true,
                              onChange: (e) => enforceMaxMarks(student.studentId, subName, maxMarks, e.target.value)
                            })}
                          />
                          {exam.includeCE && (
                            <Input
                              type="number"
                              className="w-14 h-8 border-teal-200 text-center px-1"
                              placeholder="CE"
                              disabled={!editable || isAbsent}
                              {...register(`marks.${student.studentId}.${subName}.ceMarksObtained`, {
                                valueAsNumber: true,
                                onChange: (e) => enforceMaxCEMarks(student.studentId, subName, exam.maxCEMarks || 20, e.target.value)
                              })}
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1 md:mt-0 md:ml-2">
                          <Controller
                            control={control}
                            name={`marks.${student.studentId}.${subName}.absent`}
                            render={({ field }) => (
                               <Checkbox 
                                 id={`absent-${student.studentId}-${subName}`}
                                 disabled={!editable}
                                 checked={field.value}
                                 onCheckedChange={(val) => {
                                   field.onChange(val);
                                   handleAbsentToggle(student.studentId, subName, val as boolean);
                                 }}
                               />
                            )}
                          />
                          <Label 
                            htmlFor={`absent-${student.studentId}-${subName}`}
                            className="text-[10px] md:text-xs font-medium cursor-pointer uppercase"
                          >
                            Ab
                          </Label>
                        </div>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={activeSubjects.length + 1} className="text-center p-8 text-muted-foreground">
                  No students found in this class.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

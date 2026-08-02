"use client";

import { useForm, Controller } from "react-hook-form";
import { Attendance, DailyAttendanceRecord } from "@/types/schema";
import { Student } from "@/features/students/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckIcon, XIcon, UserMinusIcon, SaveIcon, SendIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { serverTimestamp, Timestamp } from "firebase/firestore";

interface AttendanceFormProps {
  attendance: Attendance;
  students: Student[];
  onSaveDraft: (data: Record<string, DailyAttendanceRecord>) => Promise<void>;
  onSubmit: (data: Record<string, DailyAttendanceRecord>) => Promise<void>;
  isSubmitting: boolean;
  disabled: boolean;
}

interface FormValues {
  records: Record<string, { status: "PRESENT" | "ABSENT" | "LEAVE" | "NONE"; remarks: string }>;
}

export function AttendanceForm({ attendance, students, onSaveDraft, onSubmit, isSubmitting, disabled }: AttendanceFormProps) {
  const { userData } = useAuthStore();
  const user = userData;

  // Initialize form with existing records
  const defaultValues: FormValues = {
    records: {}
  };

  students.forEach(student => {
    const existing = attendance.attendance[student.studentId];
    defaultValues.records[student.studentId] = {
      status: existing?.status || "PRESENT",
      remarks: existing?.remarks || "",
    };
  });

  const { control, setValue, getValues } = useForm<FormValues>({
    defaultValues,
  });

  const handleAction = async (action: 'DRAFT' | 'SUBMIT') => {
    const values = getValues();
    const finalRecords: Record<string, DailyAttendanceRecord> = {};
    
    students.forEach(student => {
      const formVal = values.records[student.studentId];
      const existing = attendance.attendance[student.studentId];
      
      finalRecords[student.studentId] = {
        status: formVal?.status || "PRESENT",
        remarks: formVal?.remarks || "",
        markedBy: existing?.markedBy || user?.uid || "SYSTEM",
        updatedBy: user?.uid || "SYSTEM",
        updatedAt: serverTimestamp() as unknown as Timestamp,
      };
    });

    if (action === 'DRAFT') {
      await onSaveDraft(finalRecords);
    } else {
      await onSubmit(finalRecords);
    }
  };

  const markAll = (status: "PRESENT" | "ABSENT" | "LEAVE" | "NONE") => {
    students.forEach(student => {
      setValue(`records.${student.studentId}.status`, status, { shouldDirty: true });
    });
  };

  const resetAll = () => {
    students.forEach(student => {
      setValue(`records.${student.studentId}.status`, "PRESENT", { shouldDirty: true });
      setValue(`records.${student.studentId}.remarks`, "", { shouldDirty: true });
    });
  };

  // Sort students by name alphabetically
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {!disabled && (
        <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/50 p-3 rounded-lg border">
          <div className="text-sm font-medium text-muted-foreground">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => markAll("PRESENT")}>
              <CheckIcon className="w-4 h-4 mr-2 text-green-600" /> Mark All Present
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => markAll("ABSENT")}>
              <XIcon className="w-4 h-4 mr-2 text-red-600" /> Mark All Absent
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => markAll("LEAVE")}>
              <UserMinusIcon className="w-4 h-4 mr-2 text-yellow-600" /> Mark All Leave
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetAll}>
              Reset
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-[300px]">Status</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student, index) => (
              <TableRow key={student.studentId}>
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-xs text-muted-foreground">{student.studentId}</div>
                </TableCell>
                <TableCell>
                  <Controller
                    control={control}
                    name={`records.${student.studentId}.status`}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={disabled || isSubmitting}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PRESENT" id={`p-${student.studentId}`} className="text-green-600" />
                          <Label htmlFor={`p-${student.studentId}`} className="cursor-pointer text-sm font-normal">Present</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ABSENT" id={`a-${student.studentId}`} className="text-red-600" />
                          <Label htmlFor={`a-${student.studentId}`} className="cursor-pointer text-sm font-normal">Absent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="LEAVE" id={`l-${student.studentId}`} className="text-yellow-600" />
                          <Label htmlFor={`l-${student.studentId}`} className="cursor-pointer text-sm font-normal">Leave</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NONE" id={`n-${student.studentId}`} className="text-muted-foreground" />
                          <Label htmlFor={`n-${student.studentId}`} className="cursor-pointer text-sm font-normal text-muted-foreground">Unmarked</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Controller
                    control={control}
                    name={`records.${student.studentId}.remarks`}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Optional remarks..."
                        disabled={disabled || isSubmitting}
                        className="h-8 text-sm"
                      />
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
            {sortedStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No students found in this class.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!disabled && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleAction('DRAFT')}
            disabled={isSubmitting}
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            type="button" 
            onClick={() => handleAction('SUBMIT')}
            disabled={isSubmitting}
          >
            <SendIcon className="w-4 h-4 mr-2" />
            Submit Attendance
          </Button>
        </div>
      )}
    </div>
  );
}

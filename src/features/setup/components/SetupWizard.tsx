"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Madrassa, User } from "@/types/schema";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { gradeSettingsService } from "@/features/settings/services/gradeSettingsService";
import { attendanceSettingsService } from "@/features/settings/services/attendanceSettingsService";
import { setupService } from "../services/setupService";
import { Timestamp } from "firebase/firestore";

export function SetupWizard({ madrassa, user }: { madrassa: Madrassa; user: User }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function checkExistingSetup() {
      if (!madrassa.id) return;
      try {
        const { years } = await academicYearService.getAcademicYears(madrassa.id, "ALL", "", 1);
        if (years.length > 0) {
          const gradesSet = await gradeSettingsService.getGradeSettings(madrassa.id);
          if (gradesSet) {
            const attendanceSet = await attendanceSettingsService.getAttendanceSettings(madrassa.id);
            if (attendanceSet) {
              setStep(4);
            } else {
              setStep(3);
            }
          } else {
            setStep(2);
          }
        }
      } catch (error) {
        console.error("Error checking existing setup:", error);
      } finally {
        setIsInitializing(false);
      }
    }
    checkExistingSetup();
  }, [madrassa.id]);

  // Form states
  const [academicYear, setAcademicYear] = useState({ name: "2026-2027", startDate: "", endDate: "" });
  const [grades, setGrades] = useState({ passPercentage: 40 });
  const [attendance, setAttendance] = useState({ allowPastEditDays: 3 });

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      if (step === 1) {
        // Step 1: Academic Year
        if (!academicYear.name || !academicYear.startDate || !academicYear.endDate) {
          throw new Error("Please fill all fields");
        }
        
        // Prevent duplicate creation if they hit back
        const { years } = await academicYearService.getAcademicYears(madrassa.id!, "ALL", "", 1);
        if (years.length === 0) {
          await academicYearService.createAcademicYear({
            madrassaId: madrassa.id!,
            name: academicYear.name,
            startDate: Timestamp.fromDate(new Date(academicYear.startDate)),
            endDate: Timestamp.fromDate(new Date(academicYear.endDate)),
            status: "ACTIVE",
            isCurrent: true
          }, user.uid);
        }
      } else if (step === 2) {
        // Step 2: Grade Settings
        if (!grades.passPercentage || grades.passPercentage < 1 || grades.passPercentage > 59) {
          throw new Error("Passing percentage must be between 1 and 59");
        }
        await gradeSettingsService.updateGradeSettings(madrassa.id!, {
          failurePercentage: grades.passPercentage,
          grades: [
            { id: "grade-a", grade: "A", minPercentage: 80, maxPercentage: 100, gradePoint: 4, remarks: "Excellent" },
            { id: "grade-b", grade: "B", minPercentage: 60, maxPercentage: 79, gradePoint: 3, remarks: "Good" },
            { id: "grade-c", grade: "C", minPercentage: grades.passPercentage, maxPercentage: 59, gradePoint: 2, remarks: "Pass" },
            { id: "grade-f", grade: "F", minPercentage: 0, maxPercentage: grades.passPercentage - 1, gradePoint: 0, remarks: "Fail" },
          ]
        }, user.uid);
      } else if (step === 3) {
        // Step 3: Attendance Settings
        await attendanceSettingsService.updateAttendanceSettings(madrassa.id!, {
          allowPastEditDays: attendance.allowPastEditDays,
          allowFutureAttendance: false,
          attendanceAlertThreshold: 75,
          weekendDays: [0, 6],
          defaultStatus: "PRESENT",
        }, user.uid);
      } else if (step === 4) {
        // Step 4: Complete Setup
        await setupService.completeSetup(madrassa.id!);
        toast.success("Setup completed successfully!");
        router.push("/management");
        // Force hard reload to reset layout checks
        window.location.href = "/management";
        return;
      }
      setStep(s => s + 1);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return (
      <Card className="w-full flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading setup progress...</span>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-1 h-2 rounded-full ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <CardTitle>
          {step === 1 && "Create Academic Year"}
          {step === 2 && "Grade Settings"}
          {step === 3 && "Attendance Settings"}
          {step === 4 && "All Done!"}
        </CardTitle>
        <CardDescription>
          {step === 1 && "Set up the first academic year for your madrassa."}
          {step === 2 && "Configure the minimum passing percentage for examinations."}
          {step === 3 && "Configure how many days in the past teachers can edit attendance."}
          {step === 4 && "Your madrassa is ready to use!"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Academic Year Name</Label>
              <Input 
                value={academicYear.name} 
                onChange={e => setAcademicYear({...academicYear, name: e.target.value})} 
                placeholder="2026-2027" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={academicYear.startDate} 
                  onChange={e => setAcademicYear({...academicYear, startDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={academicYear.endDate} 
                  onChange={e => setAcademicYear({...academicYear, endDate: e.target.value})} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Passing Percentage (%)</Label>
              <Input 
                type="number" 
                value={grades.passPercentage || ""} 
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setGrades({...grades, passPercentage: isNaN(val) ? 0 : val});
                }} 
                min={1} max={59}
              />
              <p className="text-sm text-muted-foreground">Default grading scale (A, B, C, F) will be generated automatically.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allow Past Edit Days</Label>
              <Input 
                type="number" 
                value={attendance.allowPastEditDays} 
                onChange={e => setAttendance({...attendance, allowPastEditDays: parseInt(e.target.value)})} 
                min={0}
              />
              <p className="text-sm text-muted-foreground">Number of days in the past a teacher is allowed to mark/edit attendance.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-medium">Setup Complete</h3>
            <p className="text-muted-foreground">You can always change these settings later from the dashboard.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={isSubmitting}>
            Back
          </Button>
        )}
        <Button onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === 4 ? "Go to Dashboard" : "Save & Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}

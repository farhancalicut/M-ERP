"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { StudentFeeDashboardClient } from "./StudentFeeDashboardClient";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { Student, StudentFee, FeePayment } from "@/types/schema";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StudentFeeManagerSheetProps {
  studentId: string;
  academicYearId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentFeeManagerSheet({
  studentId,
  academicYearId,
  isOpen,
  onClose,
}: StudentFeeManagerSheetProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    student: Student;
    feeSummary: StudentFee | null;
    payments: FeePayment[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && studentId && academicYearId) {
      fetchData();
    }
  }, [isOpen, studentId, academicYearId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const student = await studentService.getStudent(studentId);
      if (!student) throw new Error("Student not found");

      const feeSummary = await studentFeeService.getStudentFees(studentId, academicYearId);
      const paymentsRes = await paymentService.getPayments(student.madrassaId, { studentId }, 100);

      setData({
        student,
        feeSummary,
        payments: paymentsRes.payments,
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to load student data.");
      onClose(); // Close if we can't load data
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* We use a very wide sheet to accommodate the dashboard comfortably */}
      <SheetContent side="right" className="w-full sm:max-w-[85vw] md:max-w-[75vw] lg:max-w-[65vw] overflow-y-auto bg-background border-l shadow-2xl p-0">
        {loading || !data ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p>Loading student financial profile...</p>
          </div>
        ) : (
          <div className="p-6 h-full">
            <StudentFeeDashboardClient
              student={data.student}
              feeSummary={data.feeSummary}
              payments={data.payments}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

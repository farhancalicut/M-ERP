"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { classService } from "@/features/academic/services/classService";
import { StudentFeeDashboardClient } from "@/features/fees/components/StudentFeeDashboardClient";
import { Student, StudentFee, FeePayment } from "@/types/schema";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function StudentFeeDetailsPage({ params }: { params: { id: string } }) {
  const { currentAcademicYear, userData } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<{
    student: Student;
    feeSummary: StudentFee | null;
    payments: FeePayment[];
    className: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentAcademicYear?.id) return;
      try {
        const student = await studentService.getStudent(params.id);
        if (!student) throw new Error("Student not found");

        const [feeSummary, paymentsRes, classRes] = await Promise.all([
          studentFeeService.getStudentFees(params.id, currentAcademicYear.id),
          paymentService.getPayments(student.madrassaId, { studentId: params.id }, 100),
          student.classId
            ? classService.getClass(student.classId).catch(() => null)
            : Promise.resolve(null),
        ]);

        setData({
          student,
          feeSummary,
          payments: paymentsRes.payments,
          className: (classRes as any)?.name || "—",
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load student data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, currentAcademicYear?.id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-24 text-muted-foreground">Student data could not be loaded.</div>
  );

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="pl-0 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
      </Button>
      <StudentFeeDashboardClient
        student={data.student}
        feeSummary={data.feeSummary}
        payments={data.payments}
        className={data.className}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { StudentFeeDashboardClient } from "@/features/fees/components/StudentFeeDashboardClient";
import { Student, StudentFee, FeePayment } from "@/types/schema";
import { toast } from "sonner";

export default function StudentFeeDetailsPage({ params }: { params: { id: string } }) {
  const { currentAcademicYear } = useAuthStore();
  const [data, setData] = useState<{ student: Student, feeSummary: StudentFee | null, payments: FeePayment[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentAcademicYear?.id) return;
      try {
        const student = await studentService.getStudent(params.id);
        if (!student) throw new Error("Student not found");
        
        const feeSummary = await studentFeeService.getStudentFees(params.id, currentAcademicYear.id);
        
        const paymentsRes = await paymentService.getPayments(student.madrassaId, { studentId: params.id }, 100);
        
        setData({ student, feeSummary, payments: paymentsRes.payments });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load student data.");
        // Still set data with empty so it doesn't stay loading forever if it fails partially
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, currentAcademicYear?.id]);

  if (loading || !data) return <div className="p-8 text-center animate-pulse">Loading student data...</div>;

  return <StudentFeeDashboardClient student={data.student} feeSummary={data.feeSummary} payments={data.payments} />;
}

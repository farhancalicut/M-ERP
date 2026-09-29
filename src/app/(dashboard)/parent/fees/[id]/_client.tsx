"use client";

import { useEffect, useState } from "react";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { StudentFeeDashboardClient } from "@/features/fees/components/StudentFeeDashboardClient";
import { useAuthStore } from "@/stores/authStore";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ParentStudentFeePage({ params }: { params: { id: string } }) {
  const { userData, currentAcademicYear } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id && userData.role === "PARENT") {
      Promise.all([
        studentService.getStudent(params.id),
        studentFeeService.getStudentFees(params.id, currentAcademicYear.id),
        paymentService.getStudentPayments(userData.madrassaId, params.id, currentAcademicYear.id)
      ]).then(([student, feeSummary, payments]) => {
        const parentIdentifier = (userData as any).domainId || userData.id;
        // Enforce parent ownership check
        if (!student || student.madrassaId !== userData.madrassaId || student.parentId !== parentIdentifier) {
          router.push("/parent/fees");
        } else {
          setData({ student, feeSummary, payments });
        }
        setLoading(false);
      });
    } else if (userData) {
      setLoading(false);
    }
  }, [userData, params.id, router]);

  if (loading) return <div>Loading...</div>;
  if (!currentAcademicYear?.id) return <div>No active academic year found.</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
        <h1 className="text-3xl font-bold tracking-tight">{data.student.name}&apos;s Fee Details</h1>
        <p className="text-muted-foreground">
          Admission No: {data.student.admissionNo}
        </p>
      </div>
      </div>

      <StudentFeeDashboardClient 
        student={data.student}
        feeSummary={data.feeSummary}
        payments={data.payments}
      />
    </div>
  );
}

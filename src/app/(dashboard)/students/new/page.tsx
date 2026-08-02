"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentAdmissionWizard } from "@/features/students/components/StudentAdmissionWizard";
import { AdmissionSuccessModal } from "@/features/students/components/AdmissionSuccessModal";
import { StudentAdmissionData } from "@/features/students/schemas/studentSchema";
import { admissionService } from "@/features/students/services/admissionService";
import { useAuthStore } from "@/stores/authStore";
import { RoleGuard } from "@/features/auth/components/RoleGuard";

export default function NewStudentPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [admittedStudentName, setAdmittedStudentName] = useState("");
  const [credentials, setCredentials] = useState<{ email?: string; password: string; } | null>(null);

  const handleSubmit = async (data: StudentAdmissionData) => {
    if (!userData?.madrassaId) return;
    setIsSubmitting(true);
    setError(undefined);

    try {
      const result = await admissionService.admitStudent({
        madrassaId: userData.madrassaId,
        classId: data.classId,
        name: data.name,
        gender: data.gender,
        dob: data.dob,
        admissionDate: data.admissionDate,
        address: data.address,
        guardianRelation: data.guardianRelation,
        fatherName: data.fatherName,
        motherName: data.motherName,
        parentMobile: data.parentMobile,
        parentEmail: data.parentEmail,
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        ...(data.bloodGroup !== undefined ? { bloodGroup: data.bloodGroup } : {}),
        ...(data.medicalNotes !== undefined ? { medicalNotes: data.medicalNotes } : {}),
        ...(data.identityMark !== undefined ? { identityMark: data.identityMark } : {}),
        ...(data.majorAchievements !== undefined ? { majorAchievements: data.majorAchievements } : {}),
        ...(data.admissionFeeAmount !== undefined ? { admissionFeeAmount: data.admissionFeeAmount } : {}),
        ...(data.admissionFeePaymentMethod !== undefined ? { admissionFeePaymentMethod: data.admissionFeePaymentMethod } : {}),
      });

      setAdmittedStudentName(result.student.name);
      setCredentials(result.credentials || null);
      setModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred during admission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    router.push("/students");
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL"]}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Admission</h1>
            <p className="text-muted-foreground mt-1">Admit a new student to the institution.</p>
          </div>
        </div>

        <StudentAdmissionWizard 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />

        <AdmissionSuccessModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          studentName={admittedStudentName}
          credentials={credentials}
        />
      </div>
    </RoleGuard>
  );
}

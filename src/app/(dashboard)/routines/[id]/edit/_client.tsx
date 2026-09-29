"use client";

import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { RoutineTemplateForm } from "@/features/routines/components/RoutineTemplateForm";

export default function EditRoutinePage() {
  return (
    <RoleGuard allowedRoles={["PRINCIPAL"]}>
      <div className="p-6">
        <RoutineTemplateForm />
      </div>
    </RoleGuard>
  );
}

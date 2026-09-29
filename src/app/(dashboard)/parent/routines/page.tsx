"use client";

import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { ParentRoutineForm } from "@/features/routines/components/ParentRoutineForm";

export default function ParentRoutinesPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Routine</h1>
          <p className="text-muted-foreground mt-1">Track and submit your child's daily routine tasks.</p>
        </div>

        <ParentRoutineForm />
      </div>
    </RoleGuard>
  );
}

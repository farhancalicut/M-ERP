"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ParentProfile } from "@/features/students/components/ParentProfile";
import { parentService } from "@/features/students/services/parentService";
import { Parent } from "@/features/students/types";
import { RoleGuard } from "@/features/auth/components/RoleGuard";

export default function ParentDetailsPage() {
  const { id } = useParams();
  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id === "string") {
      parentService.getParent(id).then((data) => {
        setParent(data);
        setLoading(false);
      });
    }
  }, [id]);

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL", "TEACHER", "PARENT"]}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Parent Details</h1>
        {loading ? (
          <div className="py-8 text-muted-foreground">Loading parent...</div>
        ) : parent ? (
          <ParentProfile parent={parent} />
        ) : (
          <div className="py-8 text-muted-foreground">Parent not found.</div>
        )}
      </div>
    </RoleGuard>
  );
}

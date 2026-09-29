"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ParentEditForm } from "@/features/students/components/ParentEditForm";
import { parentService } from "@/features/students/services/parentService";
import { Parent } from "@/features/students/types";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { useAuthStore } from "@/stores/authStore";
import { ParentEditData } from "@/features/students/schemas/parentSchema";
import { toast } from "sonner";

export default function EditParentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (typeof id === "string" && userData?.madrassaId) {
      parentService.getParent(id).then((parentData) => {
        setParent(parentData);
        setLoading(false);
      });
    }
  }, [id, userData?.madrassaId]);

  const handleSubmit = async (data: ParentEditData) => {
    if (!parent || typeof id !== "string") return;
    
    setIsSubmitting(true);
    setError(undefined);
    try {
      await parentService.updateParent(id, {
        fatherName: data.fatherName,
        motherName: data.motherName,
        mobile: data.mobile,
        address: data.address,
      });
      
      toast.success("Guardian profile updated successfully");
      router.push("/parents");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update guardian profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL"]}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Guardian Profile</h1>
          <p className="text-muted-foreground mt-1">Update contact and personal details.</p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading guardian data...</div>
        ) : parent ? (
          <div className="bg-card border rounded-xl p-6">
            <ParentEditForm 
              initialData={parent} 
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={error}
              onCancel={() => router.push("/parents")}
            />
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Guardian not found.</div>
        )}
      </div>
    </RoleGuard>
  );
}

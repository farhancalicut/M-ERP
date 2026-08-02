"use client";

import { FeeCategoryForm } from "@/features/fees/components/FeeCategoryForm";
import { FeeCategoryFormValues } from "@/features/fees/schemas/feeSchemas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { FeeCategory, Class } from "@/types/schema";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";

interface FeeCategoryFormClientProps {
  initialData?: FeeCategory;
  action: (data: FeeCategoryFormValues) => Promise<void>;
  onSuccess?: () => void;
}

export function FeeCategoryFormClient({ initialData, action, onSuccess }: FeeCategoryFormClientProps) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    if (userData?.madrassaId) {
      classService.getClasses(userData.madrassaId, "ALL", undefined, 100).then(res => {
        setClasses(res.classes);
      });
    }
  }, [userData?.madrassaId]);

  const handleSubmit = async (data: FeeCategoryFormValues) => {
    try {
      setIsLoading(true);
      await action(data);
      toast.success(initialData ? "Category updated successfully" : "Category created successfully");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/settings/fees-management");
        router.refresh();
      }
    } catch (error: Error | unknown) {
      toast.error((error as any).message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return <FeeCategoryForm initialData={initialData} classes={classes} onSubmit={handleSubmit} isLoading={isLoading} />;
}

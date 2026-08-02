"use client";

import { useEffect, useState } from "react";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { FeeCategoryFormValues } from "@/features/fees/schemas/feeSchemas";
import { FeeCategoryFormClient } from "@/features/fees/components/FeeCategoryFormClient";
import { useAuthStore } from "@/stores/authStore";
import { FeeCategory } from "@/types/schema";

import { useRouter } from "next/navigation";

export default function EditFeeCategoryPage({ params }: { params: { id: string } }) {
  const { userData, user } = useAuthStore();
  const [category, setCategory] = useState<FeeCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (userData?.madrassaId) {
      feeCategoryService.getFeeCategory(params.id).then(res => {
        if (!res || res.madrassaId !== userData.madrassaId) {
          router.push("/settings/fees-categories");
        } else {
          setCategory(res);
        }
        setLoading(false);
      });
    }
  }, [userData?.madrassaId, params.id, router]);

  const updateCategory = async (data: FeeCategoryFormValues) => {
    if (!user) return;
    await feeCategoryService.updateFeeCategory(params.id, data as any, user.uid);
  };

  if (loading) return <div>Loading...</div>;
  if (!category) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Fee Category</h1>
        <p className="text-muted-foreground">
          Update the details of this fee structure.
        </p>
      </div>

      <FeeCategoryFormClient initialData={category} action={updateCategory} />
    </div>
  );
}

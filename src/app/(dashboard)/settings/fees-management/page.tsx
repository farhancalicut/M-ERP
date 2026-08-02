"use client";

import { useEffect, useState } from "react";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { FeeCategoryClient } from "@/features/fees/components/FeeCategoryClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { FeeCategory } from "@/types/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeeCategoryFormClient } from "@/features/fees/components/FeeCategoryFormClient";
import { toast } from "sonner";
import { FeeCategoryFormValues } from "@/features/fees/schemas/feeSchemas";

export default function FeeManagementPage() {
  const { userData } = useAuthStore();
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | undefined>();

  useEffect(() => {
    if (userData?.madrassaId) {
      loadCategories();
    }
  }, [userData?.madrassaId]);

  const loadCategories = () => {
    if (!userData?.madrassaId) return;
    feeCategoryService.getFeeCategories(userData.madrassaId, {}, 100).then(res => {
      setCategories(res.categories);
      setLoading(false);
    });
  };

  const handleAction = async (data: FeeCategoryFormValues) => {
    if (!userData?.madrassaId || !userData?.uid) return;
    if (editingCategory) {
      // updateFeeCategory signature: (id, data, updatedBy)
      await feeCategoryService.updateFeeCategory(editingCategory.id as string, data as any, userData.uid);
    } else {
      // createFeeCategory signature: (madrassaId, data, createdBy)
      await feeCategoryService.createFeeCategory(userData.madrassaId, data as any, userData.uid);
    }
    setIsDialogOpen(false);
    loadCategories(); // Refresh list
  };

  const handleOpenAdd = () => {
    setEditingCategory(undefined);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: FeeCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">
            Manage tuition, admission, and custom fee categories.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Fees
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Fee Category" : "Add Fee Category"}</DialogTitle>
            </DialogHeader>
            <FeeCategoryFormClient 
               {...(editingCategory ? { initialData: editingCategory } : {})}
               action={handleAction} 
               onSuccess={() => setIsDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>

      </div>

      <FeeCategoryClient 
        categories={categories} 
        onEdit={handleOpenEdit}
        deleteAction={async (id) => {
          await feeCategoryService.deleteFeeCategory(id);
          setCategories(prev => prev.filter(c => c.id !== id));
        }} 
      />
    </div>
  );
}

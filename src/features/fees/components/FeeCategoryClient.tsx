"use client";

import { FeeCategory } from "@/types/schema";
import { FeeCategoryTable } from "./FeeCategoryTable";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeeCategoryClientProps {
  categories: FeeCategory[];
  deleteAction: (id: string) => Promise<void>;
  onEdit: (category: FeeCategory) => void;
}

export function FeeCategoryClient({ categories, deleteAction, onEdit }: FeeCategoryClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAction(deletingId);
      toast.success("Fee category deleted successfully");
      router.refresh();
    } catch (error: Error | unknown) {
      // @ts-ignore
      toast.error(error.message || "Failed to delete fee category");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <FeeCategoryTable data={categories} onDelete={(id) => setDeletingId(id)} onEdit={onEdit} />
      
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fee category. 
              Only do this if you are sure no payments are currently linked to it, otherwise you may cause data inconsistencies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NoticeFormValues } from "../schemas/notificationSchemas";
import { NoticeForm } from "./NoticeForm";
import { noticeService } from "../services/noticeService";
import { useAuth } from "@/hooks/useAuth";
import { Timestamp } from "firebase/firestore";
import { Notice } from "@/types/schema";

interface NoticeFormClientProps {
  initialData?: Notice;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function NoticeFormClient({ initialData, onSuccess, trigger }: NoticeFormClientProps) {
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const isEdit = !!initialData;

  const handleSubmit = async (data: NoticeFormValues) => {
    if (!userData) return;
    setIsSubmitting(true);
    setError(undefined);

    try {
      if (isEdit) {
        await noticeService.updateNotice(initialData!.id, {
          title: data.title,
          description: data.description,
          attachments: data.attachments || [],
          targetRoles: data.targetRoles as any[],
          targetClasses: data.targetClasses,
          targetStudentIds: data.targetStudentIds,
          expiryDate: Timestamp.fromDate(data.expiryDate),
          pinned: data.pinned,
          status: data.status,
        });
        if (data.status === "PUBLISHED" && initialData?.status !== "PUBLISHED") {
            await noticeService.publishNotice(initialData!.id, userData.uid);
        }
      } else {
        const noticeId = await noticeService.createNotice({
          madrassaId: userData.madrassaId,
          title: data.title,
          description: data.description,
          attachments: data.attachments || [],
          targetRoles: data.targetRoles as any[],
          targetClasses: data.targetClasses,
          targetStudentIds: data.targetStudentIds,
          expiryDate: Timestamp.fromDate(data.expiryDate),
          pinned: data.pinned,
          status: data.status,
        });
        if (data.status === "PUBLISHED") {
          await noticeService.publishNotice(noticeId, userData.uid);
        }
      }

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultValues = initialData ? {
    title: initialData.title,
    description: initialData.description,
    attachments: initialData.attachments || [],
    targetRoles: initialData.targetRoles,
    targetClasses: initialData.targetClasses,
    targetStudentIds: initialData.targetStudentIds,
    expiryDate: initialData.expiryDate.toDate(),
    pinned: initialData.pinned,
    status: initialData.status,
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button>
            {isEdit ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEdit ? "Edit Notice" : "Create Notice"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Notice" : "Create Notice"}</DialogTitle>
        </DialogHeader>
        {defaultValues ? (
          <NoticeForm 
            onSubmit={handleSubmit} 
            onCancel={() => setOpen(false)}
            defaultValues={defaultValues}
            isSubmitting={isSubmitting} 
            error={error} 
          />
        ) : (
          <NoticeForm 
            onSubmit={handleSubmit} 
            onCancel={() => setOpen(false)}
            isSubmitting={isSubmitting} 
            error={error} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

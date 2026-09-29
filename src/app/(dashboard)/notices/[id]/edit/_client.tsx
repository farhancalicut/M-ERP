"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { noticeService } from "@/features/notifications/services/noticeService";
import { NoticeFormValues } from "@/features/notifications/schemas/notificationSchemas";
import { NoticeForm } from "@/features/notifications/components/NoticeForm";
import { PageHeader } from "@/components/layouts/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { Notice } from "@/types/schema";
import { Timestamp } from "firebase/firestore";

export default function EditNoticePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    async function load() {
      const data = await noticeService.getNotice(params.id);
      setNotice(data);
    }
    load();
  }, [params.id]);

  const handleSubmit = async (data: NoticeFormValues) => {
    if (!userData) return;
    setIsSubmitting(true);
    setError(undefined);

    try {
      await noticeService.updateNotice(params.id, {
        title: data.title,
        description: data.description,
        attachments: data.attachments || [],
        targetRoles: data.targetRoles as any[],
        targetClasses: data.targetClasses,
        targetStudentIds: data.targetStudentIds,
        expiryDate: Timestamp.fromDate(data.expiryDate),
        pinned: data.pinned,
        status: data.status as any,
      });

      if (data.status === "PUBLISHED") {
        await noticeService.publishNotice(params.id, userData.uid);
      }

      router.push("/notices");
    } catch (err: any) {
      setError(err.message || "Failed to update notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!notice) return <p>Loading...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Edit Notice"
        description="Update announcement details"
      />
      <NoticeForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        error={error} 
        defaultValues={{
          title: notice.title,
          description: notice.description,
          attachments: notice.attachments,
          targetRoles: notice.targetRoles,
          targetClasses: notice.targetClasses,
          targetStudentIds: notice.targetStudentIds,
          expiryDate: notice.expiryDate?.toDate(),
          pinned: notice.pinned,
          status: notice.status as any,
        }}
      />
    </div>
  );
}

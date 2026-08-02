"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/types/schema";
import { noticeService } from "@/features/notifications/services/noticeService";
import { NoticeTable } from "@/features/notifications/components/NoticeTable";
import { PageHeader } from "@/components/layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NoticeFormClient } from "@/features/notifications/components/NoticeFormClient";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function NoticesPage() {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      if (!userData) return;
      try {
        const res = await noticeService.getNotices(userData.madrassaId, {}, 100);
        setNotices(res.notices);
      } catch (error) {
        console.error("Failed to load notices", error);
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, [userData]);

  const handleDelete = async (id: string) => {
    if (!userData) return;
    await noticeService.archiveNotice(id, userData.uid);
    setNotices(notices.map(n => n.id === id ? { ...n, status: "ARCHIVED" } : n));
  };

  const canCreate = userData?.role === 'SUPER_ADMIN' || userData?.role === 'MANAGEMENT' || userData?.role === 'PRINCIPAL' || userData?.role === 'TEACHER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notice Board"
        description="Manage announcements and notices"
        action={
          canCreate ? (
            <NoticeFormClient onSuccess={() => {
              // Trigger reload by a simple trick or let state update handle it
              // Since it's a simple dashboard, maybe just reload the window for now
              window.location.reload();
            }} />
          ) : undefined
        }
      />
      <NoticeTable
        data={notices}
        isLoading={loading}
        baseRoute="/notices"
        onDelete={handleDelete}
      />
    </div>
  );
}



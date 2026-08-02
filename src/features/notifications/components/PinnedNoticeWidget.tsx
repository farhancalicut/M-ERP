"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/types/schema";
import { noticeService } from "../services/noticeService";
import { NoticeCard } from "./NoticeCard";
import { Skeleton } from "@/components/ui/skeleton";

export function PinnedNoticeWidget({ madrassaId, role }: { madrassaId: string, role?: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      try {
        const filters: any = { status: "PUBLISHED", pinned: true };
        if (role) {
           filters.targetRoles = [role];
        }
        const res = await noticeService.getNotices(madrassaId, filters, 3);
        setNotices(res.notices);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, [madrassaId, role]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notices.length === 0) return null;

  return (
    <div className="space-y-4">
      {notices.map(notice => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/types/schema";
import { noticeService } from "../services/noticeService";
import { NoticeCard } from "./NoticeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function NoticeBoardWidget({ madrassaId, role, classId }: { madrassaId: string, role?: string, classId?: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      try {
        const filters: any = { status: "PUBLISHED" };
        if (role) {
           filters.targetRoles = [role];
        }
        // Ideally pass classId to filter, but our current noticeService only filters by roles and pinned status.
        // If classId is needed, we would add it to noticeService constraints.
        const res = await noticeService.getNotices(madrassaId, filters, 5);
        setNotices(res.notices);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, [madrassaId, role, classId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (notices.length === 0) {
    return <p className="text-sm text-gray-500 p-4 border rounded-md">No new notices at this time.</p>;
  }

  return (
    <div className="space-y-4">
      {notices.map(notice => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  );
}

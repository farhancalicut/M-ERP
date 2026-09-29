"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { noticeService } from "@/features/notifications/services/noticeService";
import { Notice } from "@/types/schema";
import { NoticeCard } from "@/features/notifications/components/NoticeCard";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AlumniNewsPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!madrassaId) return;
      try {
        setLoading(true);
        // Fetch published notices targeted at ALUMNI
        const res = await noticeService.getNotices(madrassaId, { status: "PUBLISHED", targetRoles: ["ALUMNI"] }, 50);
        setNotices(res.notices);
      } catch (err) {
        toast.error("Failed to load news");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [madrassaId]);

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">News & Announcements</h1>
          <p className="text-muted-foreground mt-1">Stay updated with the latest news from your Alma Mater</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed rounded-xl p-12 text-center shadow-sm">
          <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No News Yet</h2>
          <p className="text-muted-foreground">
            There are no recent announcements for alumni. Please check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

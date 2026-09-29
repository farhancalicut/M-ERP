"use client";

import { useEffect, useState, useCallback } from "react";
import { Notification } from "@/types/schema";
import { notificationService } from "@/features/notifications/services/notificationService";
import { PageHeader } from "@/components/layouts/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import {
  Bell,
  BookOpen,
  CreditCard,
  ClipboardList,
  Megaphone,
  CalendarCheck,
  Info,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const typeIcons: Record<string, React.ElementType> = {
  FEES: CreditCard,
  EXAM: ClipboardList,
  RESULT: ClipboardList,
  HOMEWORK: BookOpen,
  ASSIGNMENT: BookOpen,
  NOTICE: Megaphone,
  ATTENDANCE: CalendarCheck,
  PROMOTION: CalendarCheck,
  GENERAL: Info,
};

const typeColors: Record<string, string> = {
  FEES: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  RESULT: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  EXAM: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  HOMEWORK: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  ASSIGNMENT: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  NOTICE: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  ATTENDANCE: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  GENERAL: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

const LOCAL_KEY = (uid: string) => `notif_reads_${uid}`;

function getLocalReads(uid: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalRead(uid: string, notifId: string) {
  const reads = getLocalReads(uid);
  if (!reads[notifId]) {
    reads[notifId] = Date.now();
    localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(reads));
  }
}

function isPersonalNotif(n: Notification) {
  return n.receiverType === "USER" || n.receiverType === "STUDENT";
}

function isUnread(n: Notification, uid: string): boolean {
  if (isPersonalNotif(n)) return !n.readBy?.includes(uid);
  return !getLocalReads(uid)[n.id];
}

export default function NotificationsPage() {
  const { user, userData } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!userData || !user) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(
        userData.madrassaId,
        user.uid,
        [userData.role],
        undefined,
        undefined,
        50
      );
      setNotifications(res.notifications);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  }, [userData, user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const markRead = async (n: Notification) => {
    if (!user) return;
    if (isPersonalNotif(n)) {
      try {
        await notificationService.markAsReadInFirestore(n.id, user.uid, n.readBy);
      } catch { /* non-critical */ }
    }
    setLocalRead(user.uid, n.id);
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id
          ? { ...item, readBy: Array.from(new Set([...(item.readBy ?? []), user.uid])) }
          : item
      ) as Notification[]
    );
  };

  const markAllRead = () => {
    if (!user) return;
    notifications.forEach((n) => setLocalRead(user.uid, n.id));
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readBy: isPersonalNotif(n)
          ? Array.from(new Set([...(n.readBy ?? []), user!.uid]))
          : n.readBy,
      })) as Notification[]
    );
  };

  const unreadCount = user
    ? notifications.filter((n) => isUnread(n, user.uid)).length
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Notifications"
          description="Your complete notification history"
        />
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 mt-1 gap-1.5"
            onClick={markAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              You'll see important updates here when they arrive.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border/60">
          {notifications.map((n) => {
            const unread = user ? isUnread(n, user.uid) : false;
            const Icon = typeIcons[n.type] ?? Info;
            const colorClass = typeColors[n.type] ?? typeColors.GENERAL;
            const createdAt = n.createdAt?.toDate?.() ?? new Date();

            return (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={cn(
                  "w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30",
                  unread && "bg-primary/5 hover:bg-primary/8"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mt-0.5 shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                    colorClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        unread
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                        {format(createdAt, "MMM d, h:mm a")}
                      </span>
                      {unread && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

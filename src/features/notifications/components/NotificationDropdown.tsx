"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  BookOpen,
  CreditCard,
  ClipboardList,
  Megaphone,
  CalendarCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Notification } from "@/types/schema";
import { notificationService } from "../services/notificationService";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// ─── Icon map by notification type ───────────────────────────────────────────
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

export function NotificationDropdown() {
  const { user, userData } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const computeUnread = useCallback(
    (notifs: Notification[], uid: string) => {
      const localReads = getLocalReads(uid);
      let count = 0;
      notifs.forEach((n) => {
        if (isPersonalNotif(n)) {
          if (!n.readBy?.includes(uid)) count++;
        } else {
          if (!localReads[n.id]) count++;
        }
      });
      return count;
    },
    []
  );

  const loadNotifications = useCallback(async () => {
    if (!user || !userData) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(
        userData.madrassaId,
        user.uid,
        [userData.role],
        undefined,
        undefined,
        20
      );
      setNotifications(res.notifications);
      setUnreadCount(computeUnread(res.notifications, user.uid));
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, [user, userData, computeUnread]);

  // Load on mount
  useEffect(() => {
    if (user && userData) {
      loadNotifications();
    }
  }, [user, userData, loadNotifications]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) loadNotifications();
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!user) return;

    // For targeted notifications, mark read in Firestore
    if (isPersonalNotif(n)) {
      try {
        await notificationService.markAsReadInFirestore(n.id, user.uid, n.readBy);
      } catch {
        // non-critical, ignore
      }
    }

    // Always record locally for instant UI feedback and mass-notif reads
    setLocalRead(user.uid, n.id);

    // Update local state immediately
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id
          ? { ...item, readBy: Array.from(new Set([...(item.readBy ?? []), user.uid])) }
          : item
      ) as Notification[]
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    notifications.forEach((n) => {
      setLocalRead(user.uid, n.id);
    });
    // Optimistically update state
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readBy: isPersonalNotif(n)
          ? Array.from(new Set([...(n.readBy ?? []), user.uid]))
          : n.readBy,
      })) as Notification[]
    );
    setUnreadCount(0);
  };

  if (!user || !userData) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px] font-bold"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                You're all caught up!
              </p>
              <p className="text-xs text-muted-foreground/70">
                No notifications yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => {
                const localReads = getLocalReads(user.uid);
                const isUnread = isPersonalNotif(n)
                  ? !n.readBy?.includes(user.uid)
                  : !localReads[n.id];

                const Icon = typeIcons[n.type] ?? Info;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      isUnread && "bg-primary/5"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                        isUnread
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug line-clamp-1",
                            isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-muted-foreground"
                          )}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {n.createdAt
                          ? formatDistanceToNow(
                              n.createdAt.toDate?.() ?? new Date(n.createdAt),
                              { addSuffix: true }
                            )
                          : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 bg-muted/30">
          <Link
            href="/notifications"
            className="text-xs text-primary font-medium hover:underline w-full block text-center"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Notification } from "@/types/schema";
import { notificationService } from "../services/notificationService";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function NotificationDropdown() {
  const { user } = useAuth();
  const userData = (user as any)?.userData || (globalThis as any).userData;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = async () => {
    if (!user || !userData) return;
    try {
      const roles = [userData.role];
      const res = await notificationService.getNotifications(userData.madrassaId, user.uid, roles, undefined, undefined, 20);
      
      const localReadsStr = localStorage.getItem("notification_reads_" + user.uid);
      const localReads = localReadsStr ? JSON.parse(localReadsStr) : {};

      // Filter out notifications read more than 3 days ago
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const validNotifications = res.notifications.filter(n => {
        const readTime = localReads[n.id];
        if (readTime && typeof readTime === 'number') {
          if (now - readTime > threeDaysMs) return false;
        }
        return true;
      });

      setNotifications(validNotifications);
      
      let count = 0;
      validNotifications.forEach(n => {
        // If it's a specific notification, check readBy array
        if (n.receiverType === 'USER' || n.receiverType === 'STUDENT') {
          if (!n.readBy?.includes(user.uid)) count++;
        } else {
          // It's a mass notification, check local storage
          if (!localReads[n.id]) count++;
        }
      });
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (user && userData) {
      loadNotifications();
    }
  }, [user, userData]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadNotifications();
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!user) return;
    
    // Mark as read in Firestore if personal
    if (n.receiverType === 'USER' || n.receiverType === 'STUDENT') {
      await notificationService.markAsReadInFirestore(n.id, user.uid, n.readBy);
    } 
    
    // Always store the timestamp locally when seen
    const localReadsStr = localStorage.getItem("notification_reads_" + user.uid);
    const localReads = localReadsStr ? JSON.parse(localReadsStr) : {};
    if (!localReads[n.id]) {
      localReads[n.id] = Date.now();
      localStorage.setItem("notification_reads_" + user.uid, JSON.stringify(localReads));
    }
    
    // Re-calculate unread count locally for instant UI update
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
            View All
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map(n => {
              const localReadsStr = typeof window !== 'undefined' ? localStorage.getItem("notification_reads_" + user.uid) : null;
              const localReads = localReadsStr ? JSON.parse(localReadsStr) : {};
              const isUnread = (n.receiverType === 'USER' || n.receiverType === 'STUDENT') 
                ? !n.readBy?.includes(user.uid) 
                : !localReads[n.id];
              
              return (
                <DropdownMenuItem 
                  key={n.id} 
                  className={"flex flex-col items-start p-3 cursor-pointer "}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex justify-between w-full items-center mb-1">
                    <span className="font-semibold text-sm">{n.title}</span>
                    {isUnread && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-1">{n.message}</p>
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


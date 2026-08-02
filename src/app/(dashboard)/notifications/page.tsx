"use client";

import { useEffect, useState } from "react";
import { Notification } from "@/types/schema";
import { notificationService } from "@/features/notifications/services/notificationService";
import { PageHeader } from "@/components/layouts/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

export default function NotificationsPage() {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userData || !user) return;
      try {
        const roles = [userData.role];
        const res = await notificationService.getNotifications(userData.madrassaId, user.uid, roles, undefined, undefined, 50);
        setNotifications(res.notifications);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userData, user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="All Notifications"
        description="Your notification history"
      />
      
      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-500">No notifications found.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => {
            const localReadsStr = typeof window !== 'undefined' ? localStorage.getItem("notification_reads_" + user!.uid) : null;
            const localReads = localReadsStr ? JSON.parse(localReadsStr) : {};
            const isUnread = (n.receiverType === 'USER' || n.receiverType === 'STUDENT') 
              ? !n.readBy?.includes(user!.uid) 
              : !localReads[n.id];

            return (
              <Card key={n.id} className={isUnread ? "bg-blue-50/20" : ""}>
                <CardContent className="p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{n.title}</span>
                    <span className="text-xs text-gray-400">{format(n.createdAt.toDate(), "MMM dd, yyyy HH:mm")}</span>
                  </div>
                  <p className="text-sm text-gray-700">{n.message}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}



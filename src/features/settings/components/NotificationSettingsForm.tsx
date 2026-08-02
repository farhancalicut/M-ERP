"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { notificationSettingsService } from "../services/notificationSettingsService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowRight, Save } from "lucide-react";

const notificationSettingsSchema = z.object({
  noticeRetentionDays: z.coerce.number().min(1).max(365),
  notificationRetentionDays: z.coerce.number().min(1).max(365)
});

type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

export function NotificationSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema) as any,
    defaultValues: {
      noticeRetentionDays: 30,
      notificationRetentionDays: 7
    }
  });

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const settings = await notificationSettingsService.getNotificationSettings(userData.madrassaId);
          if (settings) {
            form.reset({
              noticeRetentionDays: settings.noticeRetentionDays || 30,
              notificationRetentionDays: settings.notificationRetentionDays || 7
            });
          }
        } catch (error) {
          toast.error("Failed to load settings");
        } finally {
          setInitialLoading(false);
        }
      }
    }
    loadData();
  }, [userData?.madrassaId, form]);

  const onSubmit = async (data: NotificationSettingsFormData) => {
    if (!userData?.madrassaId || !userData?.id) return;
    
    setLoading(true);
    try {
      await notificationSettingsService.updateNotificationSettings(userData.madrassaId, data, userData.id);
      toast.success("Notification settings saved successfully");
      
      if (isSetupIncomplete) {
        router.push("/settings/profile");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Configuration</CardTitle>
        <CardDescription>Configure retention rules for notices and notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label>Notice Retention (Days)</Label>
              <Input type="number" {...form.register("noticeRetentionDays")} />
              <p className="text-xs text-muted-foreground">Number of days to keep notices on the board before archiving.</p>
            </div>

            <div className="space-y-2">
              <Label>Notification Retention (Days)</Label>
              <Input type="number" {...form.register("notificationRetentionDays")} />
              <p className="text-xs text-muted-foreground">Number of days to keep personal notifications before deletion.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSetupIncomplete ? (
                <>Save & Continue <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Settings</>
              )}
            </Button>
            {!isSetupIncomplete && (
              <Button type="button" variant="outline" onClick={() => router.push("/settings/profile")}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

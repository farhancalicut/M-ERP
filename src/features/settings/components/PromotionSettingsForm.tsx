"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { promotionSettingsService } from "../services/promotionSettingsService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowRight, Save } from "lucide-react";

const promotionSettingsSchema = z.object({
  autoSuggestPromotion: z.boolean(),
  allowManualOverride: z.boolean()
});

type PromotionSettingsFormData = z.infer<typeof promotionSettingsSchema>;

export function PromotionSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<PromotionSettingsFormData>({
    // @ts-ignore
    resolver: zodResolver(promotionSettingsSchema),
    defaultValues: {
      autoSuggestPromotion: true,
      allowManualOverride: true
    }
  });

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const settings = await promotionSettingsService.getPromotionSettings(userData.madrassaId);
          if (settings) {
            form.reset({
              autoSuggestPromotion: settings.autoSuggestPromotion ?? true,
              allowManualOverride: settings.allowManualOverride ?? true
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

  const onSubmit = async (data: PromotionSettingsFormData) => {
    if (!userData?.madrassaId || !userData?.id) return;
    
    setLoading(true);
    try {
      await promotionSettingsService.updatePromotionSettings(userData.madrassaId, data, userData.id);
      toast.success("Promotion settings saved successfully");
      
      if (isSetupIncomplete) {
        router.push("/settings/fees");
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
        <CardTitle>Promotion Configuration</CardTitle>
        <CardDescription>Configure rules for student academic promotions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={form.watch("autoSuggestPromotion")}
                onCheckedChange={(val) => form.setValue("autoSuggestPromotion", val)}
              />
              <div className="space-y-0.5">
                <Label>Auto-suggest Promotion based on Grades</Label>
                <p className="text-xs text-muted-foreground">System will automatically suggest promotion/detention based on result status.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={form.watch("allowManualOverride")}
                onCheckedChange={(val) => form.setValue("allowManualOverride", val)}
              />
              <div className="space-y-0.5">
                <Label>Allow Manual Override</Label>
                <p className="text-xs text-muted-foreground">Allow principals to manually override automatic promotion suggestions.</p>
              </div>
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
              <Button type="button" variant="outline" onClick={() => router.push("/settings/fees")}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

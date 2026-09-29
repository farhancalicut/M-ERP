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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { attendanceSettingsService } from "../services/attendanceSettingsService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowRight, Save } from "lucide-react";
import { AttendanceSettings } from "@/types/schema";

const attendanceSettingsSchema = z.object({
  allowPastEditDays: z.coerce.number().min(0).max(365),
  allowFutureAttendance: z.boolean(),
  attendanceAlertThreshold: z.coerce.number().min(1).max(100).optional(),
  weekendDays: z.array(z.number()),
  defaultStatus: z.enum(["PRESENT", "ABSENT", "NONE"]),
});

type AttendanceSettingsFormData = z.infer<typeof attendanceSettingsSchema>;

export function AttendanceSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<AttendanceSettingsFormData>({
    resolver: zodResolver(attendanceSettingsSchema) as any,
    defaultValues: {
      allowPastEditDays: 3,
      allowFutureAttendance: false,
      attendanceAlertThreshold: 75,
      weekendDays: [0, 6],
      defaultStatus: "PRESENT",
    }
  });

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const settings = await attendanceSettingsService.getAttendanceSettings(userData.madrassaId);
          if (settings) {
            form.reset({
              allowPastEditDays: settings.allowPastEditDays ?? 3,
              allowFutureAttendance: settings.allowFutureAttendance ?? false,
              attendanceAlertThreshold: settings.attendanceAlertThreshold ?? 75,
              weekendDays: settings.weekendDays ?? [0, 6],
              defaultStatus: settings.defaultStatus ?? "PRESENT",
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

  const onSubmit = async (data: AttendanceSettingsFormData) => {
    if (!userData?.madrassaId || !userData?.id) return;
    
    let isNavigating = false;
    setLoading(true);
    try {
      await attendanceSettingsService.updateAttendanceSettings(userData.madrassaId, data as Partial<AttendanceSettings>, userData.id);
      toast.success("Attendance settings saved successfully");
      
      if (isSetupIncomplete) {
        isNavigating = true;
        router.push("/settings/promotion");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      if (!isNavigating) {
        setLoading(false);
      }
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Configuration</CardTitle>
        <CardDescription>Configure rules for taking and editing attendance.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6 max-w-sm">
            <div className="space-y-4">
              <div>
                <Label>Weekend Configuration</Label>
                <p className="text-xs text-muted-foreground mb-3">Select the days that are considered weekends.</p>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                    const selected = form.watch("weekendDays").includes(idx);
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const current = form.getValues("weekendDays");
                          if (current.includes(idx)) {
                            form.setValue("weekendDays", current.filter(d => d !== idx));
                          } else {
                            form.setValue("weekendDays", [...current, idx].sort());
                          }
                        }}
                      >
                        {day}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Default Attendance Status</Label>
                <p className="text-xs text-muted-foreground mb-2">The default status given to students when initializing a new day.</p>
                <div className="flex gap-2">
                  {(["PRESENT", "ABSENT", "NONE"] as const).map(status => (
                    <Button
                      key={status}
                      type="button"
                      variant={form.watch("defaultStatus") === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => form.setValue("defaultStatus", status)}
                    >
                      {status === "NONE" ? "Unmarked (None)" : status.charAt(0) + status.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Allow Past Edit Days</Label>
              <Input type="number" {...form.register("allowPastEditDays")} />
              <p className="text-xs text-muted-foreground">Number of past days teachers are allowed to edit attendance.</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={form.watch("allowFutureAttendance")}
                onCheckedChange={(val) => form.setValue("allowFutureAttendance", val)}
              />
              <div className="space-y-0.5">
                <Label>Allow Future Attendance</Label>
                <p className="text-xs text-muted-foreground">Allow teachers to mark attendance for future dates.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attendance Alert Threshold (%)</Label>
              <Input type="number" {...form.register("attendanceAlertThreshold")} />
              <p className="text-xs text-muted-foreground">Minimum attendance percentage required (e.g. 75).</p>
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
              <Button type="button" variant="outline" onClick={() => { setLoading(true); router.push("/settings/promotion"); }}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

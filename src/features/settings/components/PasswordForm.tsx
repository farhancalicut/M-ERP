"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { profileService } from "../services/profileService";

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function PasswordForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<PasswordFormData>({
    // @ts-ignore
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      await profileService.changePassword(data.newPassword);
      toast.success("Password changed successfully");
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to change password. You may need to log out and log back in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" {...form.register("newPassword")} />
            {form.formState.errors.newPassword && <p className="text-sm text-red-500">{form.formState.errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

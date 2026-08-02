"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { profileService } from "../services/profileService";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Save } from "lucide-react";

const profileSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email")
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { userData, setUserData, madrassa, setMadrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<ProfileFormData>({
    // @ts-ignore
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userData?.displayName || "",
      email: userData?.email || ""
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!userData?.id) return;
    
    setLoading(true);
    try {
      await profileService.updateProfile(userData.id, data);
      
      if (isSetupIncomplete && madrassa) {
        await madrassaService.completeSetup(madrassa.code, userData.id);
        if (setMadrassa) setMadrassa({ ...madrassa, isSetupComplete: true });
      }
      
      toast.success(isSetupIncomplete ? "Setup completed successfully!" : "Profile updated successfully");
      if (setUserData) {
        setUserData({ ...userData, ...data });
      }

      if (isSetupIncomplete) {
        router.push("/management");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.id) return;

    setUploading(true);
    try {
      const url = await profileService.uploadProfilePhoto(userData.id, file);
      if (setUserData) {
        setUserData({ ...userData, photoUrl: url });
      }
      toast.success("Profile photo updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your personal details and public profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={userData?.photoUrl} />
              <AvatarFallback className="text-2xl">{userData?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Change Photo
              </Button>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept="image/*"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size 2MB.</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register("displayName")} />
              {form.formState.errors.displayName && <p className="text-sm text-red-500">{form.formState.errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSetupIncomplete ? (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Complete Setup</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Profile</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertCircle, ArrowRight, Save, Camera } from "lucide-react";
import { generalSettingsService } from "../services/generalSettingsService";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const generalSettingsSchema = z.object({
  madrassaName: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(4, "Pincode is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  principalName: z.string().min(1, "Principal Name is required"),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

export function GeneralSettingsForm() {
  const { userData, madrassa, setMadrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSetupIncomplete = madrassa?.isSetupComplete === false;

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      madrassaName: "",
      shortName: "",
      addressLine1: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      principalName: "",
    }
  });

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId && madrassa) {
        try {
          const settings = await generalSettingsService.getGeneralSettings(userData.madrassaId);
          if (settings) {
            form.reset({
              madrassaName: settings.madrassaName || "",
              shortName: settings.shortName || "",
              addressLine1: settings.addressLine1 || "",
              city: settings.city || "",
              state: settings.state || "",
              pincode: settings.pincode || "",
              phone: settings.phone || "",
              email: settings.email || "",
              principalName: settings.principalName || "",
            });
          } else {
            // Auto-fill from super-admin inputs during onboarding
            form.reset({
              madrassaName: madrassa.name || "",
              shortName: madrassa.code || "",
              addressLine1: (madrassa as any).addressLine1 || "",
              city: (madrassa as any).city || "",
              state: (madrassa as any).state || "",
              pincode: (madrassa as any).pincode || "",
              phone: madrassa.contactNumber || "",
              email: madrassa.email || "",
              principalName: "",
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
  }, [userData?.madrassaId, madrassa, form]);

  const onSubmit = async (data: GeneralSettingsFormData) => {
    if (!userData?.madrassaId || !userData?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        generalSettingsService.updateGeneralSettings(userData.madrassaId, data, userData.id),
        madrassaService.updateMadrassa(userData.madrassaId, { name: data.madrassaName })
      ]);
      
      if (setMadrassa && madrassa) {
        setMadrassa({ ...madrassa, name: data.madrassaName });
      }

      toast.success("General settings saved successfully");
      
      if (isSetupIncomplete) {
        router.push("/settings/grades");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !madrassa?.code) return;

    setUploading(true);
    try {
      const url = await madrassaService.uploadLogo(madrassa.code, file);
      if (setMadrassa) {
        setMadrassa({ ...madrassa, logoUrl: url });
      }
      toast.success("Madrassa logo updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {isSetupIncomplete && (
        <Alert variant="default" className="bg-blue-50 text-blue-900 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-semibold text-blue-800">Welcome to M-ERP!</AlertTitle>
          <AlertDescription className="text-blue-700">
            Please complete your general settings to initialize the system. Some details have been pre-filled for you.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your institution's core details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6 mb-6 pb-6 border-b">
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={madrassa?.logoUrl} />
                <AvatarFallback className="text-2xl">{madrassa?.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  Change Logo
                </Button>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size 2MB.</p>
              </div>
            </div>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input {...form.register("madrassaName")} />
                {form.formState.errors.madrassaName && <p className="text-sm text-red-500">{form.formState.errors.madrassaName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Madrassa ID</Label>
                <Input {...form.register("shortName")} readOnly disabled className="bg-muted font-mono" />
                {form.formState.errors.shortName && <p className="text-sm text-red-500">{form.formState.errors.shortName.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address Line 1</Label>
                <Input {...form.register("addressLine1")} placeholder="Street, Building name..." />
                {form.formState.errors.addressLine1 && <p className="text-sm text-red-500">{form.formState.errors.addressLine1.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input {...form.register("city")} />
                {form.formState.errors.city && <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Input {...form.register("state")} placeholder="e.g. Kerala" />
                {form.formState.errors.state && <p className="text-sm text-red-500">{form.formState.errors.state.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input {...form.register("pincode")} />
                {form.formState.errors.pincode && <p className="text-sm text-red-500">{form.formState.errors.pincode.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...form.register("phone")} />
                {form.formState.errors.phone && <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...form.register("email")} />
                {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Principal Name</Label>
                <Input {...form.register("principalName")} />
                {form.formState.errors.principalName && <p className="text-sm text-red-500">{form.formState.errors.principalName.message}</p>}
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
                <Button type="button" variant="outline" onClick={() => router.push("/settings/grades")}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { useAuthStore } from "@/stores/authStore";
import { staffService, OnboardStaffData } from "@/features/staff/services/staffService";
import { toast } from "sonner";
import { Role } from "@/types/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
export default function NewStaffPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  
  // State for success modal
  const [credentials, setCredentials] = useState<{email: string, tempPassword: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<Partial<OnboardStaffData>>({
    role: "TEACHER" as Role,
    joiningDate: new Date(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.madrassaId || !userData?.uid) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);

      const result = await staffService.onboardStaff({
        firstName: formData.firstName!,
        lastName: formData.lastName || "",
        email: formData.email!,
        contactNumber: formData.contactNumber!,
        role: formData.role as Role,
        qualification: formData.qualification,
        specialization: formData.specialization,
        joiningDate: formData.joiningDate,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        identityMarks: formData.identityMarks,
      }, userData.madrassaId, userData.uid);
      
      setCredentials(result);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to onboard staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (credentials) {
      navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Credentials copied to clipboard");
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.push("/staff")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Onboard Staff</h1>
        <p className="text-muted-foreground">Add a new staff member to the institution.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <FormError message={error} />}
          
          <FormSection title="Personal Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input required value={formData.firstName || ""} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </FormField>
              <FormField label="Last Name">
                <Input value={formData.lastName || ""} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField label="Email" required>
                <Input type="email" required value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
              </FormField>
              <FormField label="Contact Number" required>
                <Input required value={formData.contactNumber || ""} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
              </FormField>
            </div>

            <div className="mt-4">
              <FormField label="Address">
                <Input value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Employment Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role" required>
                <Select value={formData.role || ""} onValueChange={(v: Role) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="PRINCIPAL">Principal</SelectItem>
                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                    <SelectItem value="STAFF">Other Staff</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Joining Date">
                <Input type="date" value={formData.joiningDate ? formData.joiningDate.toISOString().split('T')[0] : ""} onChange={e => setFormData({...formData, joiningDate: e.target.value ? new Date(e.target.value) : undefined})} />
              </FormField>
            </div>


            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField label="Qualification">
                <Input value={formData.qualification || ""} onChange={e => setFormData({...formData, qualification: e.target.value})} placeholder="e.g. MA, B.Ed" />
              </FormField>
              <FormField label="Specialization">
                <Input value={formData.specialization || ""} onChange={e => setFormData({...formData, specialization: e.target.value})} placeholder="e.g. Mathematics" />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Medical & Other Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Blood Group">
                <Select value={formData.bloodGroup || ""} onValueChange={(v: string) => setFormData({...formData, bloodGroup: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Identity Marks">
                <Input value={formData.identityMarks || ""} onChange={e => setFormData({...formData, identityMarks: e.target.value})} placeholder="Any visible identification mark" />
              </FormField>
            </div>
          </FormSection>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/staff")}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Onboarding..." : "Onboard Staff"}
            </Button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Dialog open={!!credentials} onOpenChange={(open) => {
        if (!open) router.push("/staff");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Staff Onboarded Successfully!
            </DialogTitle>
            <DialogDescription>
              Please share these temporary credentials with the new staff member. They will be prompted to change their password upon their first login.
            </DialogDescription>
          </DialogHeader>
          
          {credentials && (
            <div className="bg-muted p-4 rounded-md mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Email (Login ID)</p>
                <p className="font-mono text-sm font-semibold">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Temporary Password</p>
                <p className="font-mono text-sm font-semibold">{credentials.tempPassword}</p>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between mt-6">
            <Button variant="outline" onClick={copyToClipboard} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Credentials"}
            </Button>
            <Button onClick={() => router.push("/staff")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

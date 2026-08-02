"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { FormSection } from "@/components/forms/FormSection";
import { useAuthStore } from "@/stores/authStore";
import { staffService } from "@/features/staff/services/staffService";
import { toast } from "sonner";
import { Role } from "@/types/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/types/schema";
import { Timestamp } from "firebase/firestore";
export default function EditStaffPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [formData, setFormData] = useState<Partial<User>>({});
  const [joiningDateStr, setJoiningDateStr] = useState<string>("");

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await staffService.getStaffById(params.id);
        if (staff) {
          setFormData(staff);
          if (staff.joiningDate) {
            setJoiningDateStr(staff.joiningDate.toDate().toISOString().split('T')[0] || "");
          }
        } else {
          toast.error("Staff member not found");
          router.push("/staff");
        }
      } catch {
        toast.error("Failed to load staff member");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.madrassaId || !userData?.uid) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);

      await staffService.updateStaff(params.id, {
        displayName: formData.displayName!,
        contactNumber: formData.contactNumber!,
        role: formData.role as Role,
        qualification: formData.qualification || "",
        specialization: formData.specialization || "",
        joiningDate: joiningDateStr ? Timestamp.fromDate(new Date(joiningDateStr)) : undefined,
        address: formData.address || "",
        bloodGroup: formData.bloodGroup || "",
        identityMarks: formData.identityMarks || "",
      });
      
      toast.success("Staff member updated successfully");
      router.push("/staff");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || "Failed to update staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 flex justify-center items-center h-48">Loading staff data...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.push("/staff")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Staff</h1>
        <p className="text-muted-foreground">Update staff member details.</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <FormError message={error} />}
          
          <FormSection title="Personal Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <Input required value={formData.displayName || ""} onChange={e => setFormData({...formData, displayName: e.target.value})} />
              </FormField>
              
              <FormField label="Email" required>
                <Input type="email" disabled value={formData.email || ""} />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after onboarding.</p>
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
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
                <Input type="date" value={joiningDateStr} onChange={e => setJoiningDateStr(e.target.value)} />
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
              {isSubmitting ? "Saving..." : "Update Staff"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

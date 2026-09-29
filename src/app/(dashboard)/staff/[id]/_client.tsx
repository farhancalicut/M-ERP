"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User as UserIcon, Briefcase, Stethoscope, Mail, Phone, MapPin, Hash, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { staffService } from "@/features/staff/services/staffService";
import { User } from "@/types/schema";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { classService } from "@/features/academic/services/classService";
import { Class, SalaryStructure } from "@/types/schema";
import { salaryService } from "@/features/finance/services/salaryService";

export default function StaffDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [staff, setStaff] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await staffService.getStaffById(params.id);
        if (data) {
          setStaff(data);
          if (userData?.madrassaId) {
             const [clsRes, sal] = await Promise.all([
               classService.getClasses(userData.madrassaId),
               salaryService.getSalaryStructure(data.uid)
             ]);
             setClasses(clsRes.classes);
             setSalary(sal);
          }
        } else {
          toast.error("Staff member not found");
          router.push("/staff");
        }
      } catch {
        toast.error("Failed to load staff member details");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchStaff();
  }, [params.id, router, userData?.madrassaId]);

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-[50vh]">Loading...</div>;
  }

  if (!staff) return null;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.push("/staff")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff List
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{staff.displayName}</h1>
            <p className="text-muted-foreground flex items-center mt-1">
              <Badge variant="outline" className="mr-2">{staff.role}</Badge>
              {staff.isActive ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </p>
          </div>
          <Button onClick={() => router.push(`/staff/${staff.uid}/edit`)}>Edit Staff</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <UserIcon className="w-5 h-5 mr-2 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center"><Mail className="w-4 h-4 mr-1" /> Email</p>
              <p className="font-medium mt-1">{staff.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center"><Phone className="w-4 h-4 mr-1" /> Contact Number</p>
              <p className="font-medium mt-1">{staff.contactNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground flex items-center"><MapPin className="w-4 h-4 mr-1" /> Address</p>
              <p className="font-medium mt-1">{staff.address || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Stethoscope className="w-5 h-5 mr-2 text-primary" />
              Medical & Other
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center"><Droplet className="w-4 h-4 mr-1" /> Blood Group</p>
              <p className="font-medium mt-1">{staff.bloodGroup || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center"><Hash className="w-4 h-4 mr-1" /> Identity Marks</p>
              <p className="font-medium mt-1">{staff.identityMarks || "None"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Briefcase className="w-5 h-5 mr-2 text-primary" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Joining Date</p>
              <p className="font-medium mt-1">
                {staff.joiningDate ? format(staff.joiningDate.toDate(), "PP") : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Qualification</p>
              <p className="font-medium mt-1">{staff.qualification || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specialization</p>
              <p className="font-medium mt-1">{staff.specialization || "Not provided"}</p>
            </div>
            {staff.role === "TEACHER" && (
              <div className="col-span-1 sm:col-span-3 border-t pt-4 mt-2">
                <p className="text-sm text-muted-foreground">Assigned Classes</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {staff.assignedClassIds && staff.assignedClassIds.length > 0 ? (
                    staff.assignedClassIds.map(id => {
                      const c = classes.find(cls => cls.id === id);
                      return <Badge key={id} variant="secondary">{c?.name || "Unknown Class"}</Badge>;
                    })
                  ) : (
                    <span className="text-sm italic text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>
            )}
            <div className="col-span-1 sm:col-span-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">Base Salary</p>
              <p className="font-medium mt-1">
                {salary?.baseSalary ? `₹${salary.baseSalary.toLocaleString()}` : <span className="italic text-muted-foreground">Not configured</span>}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

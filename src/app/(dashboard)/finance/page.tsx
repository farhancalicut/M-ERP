"use client";

import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeePaymentsTab } from "@/features/finance/components/tabs/FeePaymentsTab";
import { StudentFeesTab } from "@/features/finance/components/tabs/StudentFeesTab";
import { PayrollTab } from "@/features/finance/components/tabs/PayrollTab";
import { Receipt, GraduationCap, Users } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { Loader2 } from "lucide-react";

export default function FinanceDashboardPage() {
  const { userData, currentAcademicYear, setCurrentAcademicYear } = useAuthStore();
  const isTeacher = userData?.role === "TEACHER";
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  useEffect(() => {
    if (!userData?.madrassaId) return;
    const fetchYears = async () => {
      try {
        const response = await academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50);
        setAcademicYears(response.years.map((ay: any) => ({ id: ay.id, name: ay.name })));
      } catch (error) {
        console.error("Failed to load academic years:", error);
      } finally {
        setIsLoadingYears(false);
      }
    };
    fetchYears();
  }, [userData?.madrassaId]);

  const handleYearChange = (yearId: string) => {
    const selected = academicYears.find(y => y.id === yearId);
    if (selected) {
      setCurrentAcademicYear(selected);
    }
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "SUPER_ADMIN", "TEACHER"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isTeacher ? "Student Fees" : "Finance Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {isTeacher 
                ? "Search students to view fee status or generate monthly tuition."
                : "Manage fee collections, student payments, and staff payroll from a single integrated dashboard."}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Academic Year:</span>
            {isLoadingYears ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Select 
                value={currentAcademicYear?.id || ""} 
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[180px] bg-card font-semibold shadow-sm">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id} className="font-semibold">
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Tabs defaultValue="students" className="w-full">
          {!isTeacher && (
            <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1">
              <TabsTrigger value="payments" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <Receipt className="w-4 h-4 mr-2" />
                Fee Payments History
              </TabsTrigger>
              <TabsTrigger value="students" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <GraduationCap className="w-4 h-4 mr-2" />
                Student Fees
              </TabsTrigger>
              <TabsTrigger value="payroll" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <Users className="w-4 h-4 mr-2" />
                Staff Payroll
              </TabsTrigger>
            </TabsList>
          )}
          
          {!isTeacher && (
            <TabsContent value="payments" className="mt-0 outline-none">
              <FeePaymentsTab />
            </TabsContent>
          )}
          
          <TabsContent value="students" className="mt-0 outline-none">
            <StudentFeesTab />
          </TabsContent>
          
          {!isTeacher && (
            <TabsContent value="payroll" className="mt-0 outline-none">
              <PayrollTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </RoleGuard>
  );
}

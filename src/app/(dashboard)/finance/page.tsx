"use client";

import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceSummaryTab } from "@/features/finance/components/tabs/FinanceSummaryTab";
import { FeeCollectionTab } from "@/features/finance/components/tabs/FeeCollectionTab";
import { FeePaymentsTab } from "@/features/finance/components/tabs/FeePaymentsTab";
import { RecordsTab } from "@/features/finance/components/tabs/RecordsTab";
import { PayrollTab } from "@/features/finance/components/tabs/PayrollTab";
import { BarChart2, GraduationCap, Receipt, Wallet, Users } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { Loader2 } from "lucide-react";
import { useLazyFeeGenerator } from "@/features/fees/hooks/useLazyFeeGenerator";

export default function FinanceDashboardPage() {
  const { userData, currentAcademicYear, setCurrentAcademicYear } = useAuthStore();
  const isTeacher = userData?.role === "TEACHER";
  const isManagement = userData?.role === "MANAGEMENT";
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  useLazyFeeGenerator();

  useEffect(() => {
    if (!userData?.madrassaId) return;
    academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50).then(response => {
      setAcademicYears(response.years.map((ay: any) => ({ id: ay.id, name: ay.name })));
    }).finally(() => setIsLoadingYears(false));
  }, [userData?.madrassaId]);

  const handleYearChange = (yearId: string) => {
    const selected = academicYears.find(y => y.id === yearId);
    if (selected) setCurrentAcademicYear(selected);
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "SUPER_ADMIN", "PRINCIPAL", "TEACHER"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isTeacher ? "Fee Collection" : "Finance"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher
                ? "Search students and collect fee payments for your assigned classes."
                : "Manage student fees, track expenses, donations, and staff payroll."}
            </p>
          </div>

          {!isTeacher && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground">Academic Year:</span>
              {isLoadingYears ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Select value={currentAcademicYear?.id || ""} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[180px] bg-card font-semibold shadow-sm">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year.id} value={year.id} className="font-semibold">{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* ---- TEACHER VIEW: Only Fee Collection ---- */}
        {isTeacher ? (
          <FeeCollectionTab />
        ) : (
          /* ---- MANAGEMENT / PRINCIPAL VIEW: Full Finance Tabs ---- */
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={`grid w-full mb-8 h-12 bg-muted/50 p-1 ${isManagement ? "grid-cols-5" : "grid-cols-4"}`}>
              <TabsTrigger value="overview" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <BarChart2 className="w-4 h-4 mr-1.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="fees" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <GraduationCap className="w-4 h-4 mr-1.5" /> Fee Collection
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <Receipt className="w-4 h-4 mr-1.5" /> Transactions
              </TabsTrigger>
              <TabsTrigger value="records" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                <Wallet className="w-4 h-4 mr-1.5" /> Expenses & Donations
              </TabsTrigger>
              {isManagement && (
                <TabsTrigger value="payroll" className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2">
                  <Users className="w-4 h-4 mr-1.5" /> Payroll
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <FinanceSummaryTab />
            </TabsContent>

            <TabsContent value="fees" className="mt-0 outline-none">
              <FeeCollectionTab />
            </TabsContent>

            <TabsContent value="transactions">
              <FeePaymentsTab />
            </TabsContent>

            <TabsContent value="records">
              <RecordsTab />
            </TabsContent>

            {isManagement && (
              <TabsContent value="payroll">
                <PayrollTab />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </RoleGuard>
  );
}
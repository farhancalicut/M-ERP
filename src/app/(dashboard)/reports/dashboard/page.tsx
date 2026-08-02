"use client";

import React from "react";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { Construction } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReportGenerator } from "@/features/reports/components/AttendanceReportGenerator";
import { FeesReportGenerator } from "@/features/reports/components/FeesReportGenerator";

export default function ReportsDashboardPage() {
  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL"]}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports Hub</h1>
          <p className="text-muted-foreground">Generate comprehensive analytics and customized reports.</p>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="attendance">Monthly Attendance</TabsTrigger>
            <TabsTrigger value="fees">Fees & Payments</TabsTrigger>
            <TabsTrigger value="overview">Overview (Coming Soon)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendance">
            <AttendanceReportGenerator />
          </TabsContent>

          <TabsContent value="fees">
            <FeesReportGenerator />
          </TabsContent>
          
          <TabsContent value="overview">
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border rounded-lg bg-card">
              <div className="bg-primary/10 p-4 rounded-full text-primary">
                <Construction className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Complex Analytics</h2>
              <p className="text-muted-foreground max-w-md">
                Standard printing and CSV exporting is already available directly on the Students, Classes, and Staff pages!
              </p>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                This section is reserved for complex cross-module analytics (e.g. Fee Defaulters) and will be built soon.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}

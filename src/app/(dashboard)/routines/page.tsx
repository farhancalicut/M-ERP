"use client";

import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoutineTemplatesList } from "@/features/routines/components/RoutineTemplatesList";
import { RoutineReports } from "@/features/routines/components/RoutineReports";
import { useAuthStore } from "@/stores/authStore";

export default function RoutinesDashboardPage() {
  const { userData } = useAuthStore();
  
  // Teachers should only see reports, not templates
  const isTeacher = userData?.role === "TEACHER";
  
  return (
    <RoleGuard allowedRoles={["PRINCIPAL", "TEACHER"]}>
      <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="border-b pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Routines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isTeacher 
              ? "Monitor and review student daily routine compliance." 
              : "Manage routine templates and monitor class compliance."}
          </p>
        </div>

        {isTeacher ? (
          <RoutineReports />
        ) : (
          <Tabs defaultValue="templates" className="w-full space-y-5">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="reports">Compliance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="mt-4 focus-visible:outline-none">
              <RoutineTemplatesList />
            </TabsContent>
            
            <TabsContent value="reports" className="mt-4 focus-visible:outline-none">
              <RoutineReports />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </RoleGuard>
  );
}

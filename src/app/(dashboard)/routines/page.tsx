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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Routines</h1>
          <p className="text-muted-foreground mt-1">Manage routine templates and monitor class compliance.</p>
        </div>

        <Tabs defaultValue={isTeacher ? "reports" : "templates"} className="w-full">
          <TabsList className="mb-4">
            {!isTeacher && <TabsTrigger value="templates">Templates</TabsTrigger>}
            <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          </TabsList>
          
          {!isTeacher && (
            <TabsContent value="templates">
              <RoutineTemplatesList />
            </TabsContent>
          )}
          
          <TabsContent value="reports">
            <RoutineReports />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}

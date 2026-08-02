"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendanceReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>
        <p className="text-muted-foreground">View and export attendance statistics.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Module</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
            The Attendance Reports module will be implemented in a future phase.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveRequest } from "@/types/schema";
import { leaveService } from "@/features/leave/services/leaveService";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function PendingLeavesWidget() {
  const { userData } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaves() {
      if (!userData) return;
      try {
        const { requests } = await leaveService.getLeaveRequests(
          userData.madrassaId,
          { status: "PENDING" },
          5
        );
        setLeaves(requests);
      } catch (error) {
        console.error("Failed to load pending leaves", error);
      } finally {
        setLoading(false);
      }
    }
    loadLeaves();
  }, [userData]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Action Required</CardTitle>
          <CardDescription>Pending leave requests</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Action Required</CardTitle>
        <CardDescription>Recent pending leave requests</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {leaves.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
            No pending leave requests.
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{leave.requesterName}</p>
                    <Badge variant={leave.type === "STUDENT" ? "secondary" : "outline"} className="text-[10px] px-1 py-0 h-4">
                      {leave.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {leave.reason}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {format(leave.fromDate.toDate(), "MMM d, yyyy")} - {format(leave.toDate.toDate(), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {leaves.length > 0 && (
        <div className="p-4 pt-0 mt-auto">
          <Button asChild variant="outline" className="w-full text-xs">
            <Link href="/leave" className="flex items-center justify-center">
              View All <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

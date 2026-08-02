"use client";

import { useEffect, useState } from "react";
import { assignmentService } from "@/features/academic/services/assignmentService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";

export default function AssignmentListPage() {
  const { userData } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((userData as any)?.madrassaId && (userData as any)?.madrassa?.currentAcademicYear) {
      assignmentService.getAssignments(
        (userData as any).madrassaId, 
        (userData as any).madrassa.currentAcademicYear
      ).then(res => {
        setAssignments(res.assignments);
        setLoading(false);
      });
    } else if (userData) {
      setLoading(false);
    }
  }, [userData]);

  const columns = [
    {
      header: "Title",
      accessorKey: "title",
      cell: (row: any) => <div className="font-medium">{row.title}</div>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <Badge variant={row.status === "PUBLISHED" ? "success" : row.status === "CLOSED" ? "warning" : "default" as any}>
          {row.status}
        </Badge>
      )
    },
    {
      header: "Assigned Date",
      accessorKey: "assignedDate",
      cell: (row: any) => row.assignedDate ? new Date(row.assignedDate.seconds * 1000).toLocaleDateString() : "-"
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (row: any) => row.dueDate ? new Date(row.dueDate.seconds * 1000).toLocaleDateString() : "-"
    },
    {
      header: "Total Marks",
      accessorKey: "totalMarks",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            Manage offline assignments and projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/assignments/new">
            <Plus className="mr-2 h-4 w-4" /> Create Assignment
          </Link>
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={assignments}
          searchKey="title"
          onDelete={async (id: string) => {
            if (userData?.uid) {
              await assignmentService.updateStatus(id, "ARCHIVED", userData.uid);
              setAssignments(prev => prev.filter(h => h.id !== id));
            }
          }}
        />
      </div>
    </div>
  );
}

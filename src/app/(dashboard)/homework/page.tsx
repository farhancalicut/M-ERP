"use client";

import { useEffect, useState } from "react";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";

export default function HomeworkListPage() {
  const { userData } = useAuthStore();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((userData as any)?.madrassaId && (userData as any)?.madrassa?.currentAcademicYear) {
      homeworkService.getHomeworks(
        (userData as any).madrassaId, 
        (userData as any).madrassa.currentAcademicYear
      ).then(res => {
        setHomeworks(res.homeworks);
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
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (row: any) => row.dueDate ? new Date(row.dueDate.seconds * 1000).toLocaleDateString() : "-"
    },
    {
      header: "Allow Submissions",
      accessorKey: "allowSubmission",
      cell: (row: any) => row.allowSubmission ? "Yes" : "No"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homework</h1>
          <p className="text-muted-foreground">
            Manage and review homework assignments.
          </p>
        </div>
        <Button asChild>
          <Link href="/homework/new">
            <Plus className="mr-2 h-4 w-4" /> Create Homework
          </Link>
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={homeworks}
          searchKey="title"
          onDelete={async (id: string) => {
            if (userData?.uid) {
              await homeworkService.updateStatus(id, "ARCHIVED", userData.uid);
              setHomeworks(prev => prev.filter(h => h.id !== id));
            }
          }}
        />
      </div>
    </div>
  );
}

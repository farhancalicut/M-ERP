"use client";

import { useEffect, useState } from "react";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { classService } from "@/features/academic/services/classService";
import { subjectService } from "@/features/academic/services/subjectService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";

export default function HomeworkListPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id) {
      Promise.all([
        homeworkService.getHomeworks(userData.madrassaId, currentAcademicYear.id),
        classService.getClasses(userData.madrassaId, "ALL", undefined, 100),
        subjectService.getSubjects(userData.madrassaId, "ALL", undefined, 100)
      ]).then(([hwRes, clsRes, subRes]) => {
        // Build maps for quick lookup
        const cMap: Record<string, string> = {};
        clsRes.classes.forEach(c => { if(c.id) cMap[c.id] = c.name; });
        
        const sMap: Record<string, string> = {};
        subRes.subjects.forEach(s => { if(s.id) sMap[s.id] = s.name; });
        
        let rawHomeworks = hwRes.homeworks;
        if (userData.role === "TEACHER") {
          const assignedIds = userData.assignedClassIds || [];
          rawHomeworks = rawHomeworks.filter(h => assignedIds.includes(h.classId));
        }

        // Map homeworks with class/subject names
        const enrichedHomeworks = rawHomeworks.map(hw => ({
          ...hw,
          className: cMap[hw.classId] || "Unknown Class",
          subjectName: sMap[hw.subjectId] || "Unknown Subject"
        }));
        
        setHomeworks(enrichedHomeworks);
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
      cell: ({ row }: any) => <div className="font-medium">{row.original.title}</div>
    },
    {
      header: "Class",
      accessorKey: "className",
      cell: ({ row }: any) => <div>{row.original.className}</div>
    },
    {
      header: "Subject",
      accessorKey: "subjectName",
      cell: ({ row }: any) => <div>{row.original.subjectName}</div>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "PUBLISHED" ? "success" : row.original.status === "CLOSED" ? "warning" : "default" as any}>
          {row.original.status}
        </Badge>
      )
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: ({ row }: any) => row.original.dueDate ? new Date(row.original.dueDate.seconds * 1000).toLocaleDateString() : "-"
    },
    {
      header: "Allow Submissions",
      accessorKey: "allowSubmission",
      cell: ({ row }: any) => (row.original.allowSubmission ?? true) ? "Yes" : "No"
    },
    {
      header: "Action",
      id: "actions",
      cell: ({ row }: any) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/homework/${row.original.id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Submissions
          </Link>
        </Button>
      )
    }
  ];

  if (loading) {
    return <div className="py-12 text-center">Loading homeworks...</div>;
  }

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

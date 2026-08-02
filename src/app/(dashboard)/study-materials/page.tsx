"use client";

import { useEffect, useState } from "react";
import { studyMaterialService } from "@/features/academic/services/studyMaterialService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";

export default function StudyMaterialListPage() {
  const { userData } = useAuthStore();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((userData as any)?.madrassaId && (userData as any)?.madrassa?.currentAcademicYear) {
      studyMaterialService.getMaterials(
        (userData as any).madrassaId, 
        (userData as any).madrassa.currentAcademicYear
      ).then(res => {
        setMaterials(res.materials);
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
        <Badge variant={row.status === "ACTIVE" ? "success" : "default" as any}>
          {row.status}
        </Badge>
      )
    },
    {
      header: "Files",
      accessorKey: "files",
      cell: (row: any) => row.files?.length || 0
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: (row: any) => row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleDateString() : "-"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">
            Manage notes, resources, and study files.
          </p>
        </div>
        <Button asChild>
          <Link href="/study-materials/new">
            <Plus className="mr-2 h-4 w-4" /> Upload Material
          </Link>
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {loading ? (
          <div className="h-48 flex justify-center items-center">Loading...</div>
        ) : (
          <DataTable
            columns={columns}
            data={materials}
            searchKey="title"
            onDelete={async (id: string) => {
              if (userData?.uid) {
                await studyMaterialService.updateStatus(id, "ARCHIVED", userData.uid);
                setMaterials(prev => prev.filter(h => h.id !== id));
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

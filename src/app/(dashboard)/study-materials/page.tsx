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
  const { userData, currentAcademicYear } = useAuthStore();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id) {
      studyMaterialService.getMaterials(
        userData.madrassaId, 
        currentAcademicYear.id
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
      cell: ({ row }: any) => <div className="font-medium">{row.original.title}</div>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "ACTIVE" ? "success" : "default" as any}>
          {row.original.status}
        </Badge>
      )
    },
    {
      header: "Files",
      accessorKey: "files",
      cell: ({ row }: any) => row.original.attachments?.length || 0
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: ({ row }: any) => row.original.createdAt ? new Date(row.original.createdAt.seconds * 1000).toLocaleDateString() : "-"
    }
  ];

  if (loading) {
    return <div className="py-12 text-center">Loading study materials...</div>;
  }

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

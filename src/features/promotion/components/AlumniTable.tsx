"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Alumni } from "@/types/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { alumniService } from "../services/alumniService";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

interface AlumniTableProps {
  data: Alumni[];
  onRefresh: () => void;
}

export function AlumniTable({ data, onRefresh }: AlumniTableProps) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleStatus = async (alumni: Alumni) => {
    try {
      setUpdatingId(alumni.id as string);
      const newStatus = alumni.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await alumniService.updateAlumniStatus(alumni.id as string, newStatus, userData?.uid || "");
      toast.success(`Alumni marked as ${newStatus}`);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update Failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: ColumnDef<Alumni>[] = [
    {
      accessorKey: "alumniId",
      header: "Alumni ID",
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.alumniId}</span>
    },
    {
      accessorKey: "name",
      header: "Name"
    },
    {
      accessorKey: "completionYear",
      header: "Completion Year"
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      cell: ({ row }) => row.original.mobile || "N/A"
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const alumni = row.original;
        const isUpdating = updatingId === alumni.id as string;
        
        return (
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/alumni/${alumni.id as string}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleToggleStatus(alumni)}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {alumni.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      }
    }
  ];

  return <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search alumni by name..." />;
}

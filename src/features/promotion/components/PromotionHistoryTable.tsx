"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Promotion } from "@/types/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Undo2, Loader2 } from "lucide-react";
import { promotionService } from "../services/promotionService";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

interface PromotionHistoryTableProps {
  data: Promotion[];
  onRefresh: () => void;
}

export function PromotionHistoryTable({ data, onRefresh }: PromotionHistoryTableProps) {
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const { userData } = useAuthStore();

  const handleRollback = async (promotionId: string) => {
    if (!confirm("Are you sure you want to rollback this promotion? This action will revert all student classes and status.")) return;
    
    try {
      setRollingBackId(promotionId);
      // Validate first
      await promotionService.validateRollbackAllowed(promotionId);
      // Execute rollback
      await promotionService.rollbackPromotion(promotionId, userData?.uid || "");
      toast.success("The promotion has been reverted.");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rollback Failed");
    } finally {
      setRollingBackId(null);
    }
  };

  const columns: ColumnDef<Promotion>[] = [
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => {
        const val = row.original.createdAt as { toDate: () => Date };
        if (!val?.toDate) return "N/A";
        return format(val.toDate(), "dd MMM yyyy, hh:mm a");
      }
    },
    {
      accessorKey: "academicYearId",
      header: "Academic Year (Source)"
    },
    {
      accessorKey: "totalStudents",
      header: "Total"
    },
    {
      accessorKey: "promotedCount",
      header: "Promoted",
      cell: ({ row }) => <span className="text-green-600 font-bold">{row.original.promotedCount}</span>
    },
    {
      accessorKey: "detainedCount",
      header: "Detained",
      cell: ({ row }) => <span className="text-red-600 font-bold">{row.original.detainedCount}</span>
    },
    {
      accessorKey: "alumniCount",
      header: "Alumni",
      cell: ({ row }) => <span className="text-blue-600 font-bold">{row.original.alumniCount}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "COMPLETED" ? "default" : "destructive"}>
          {row.original.status}
        </Badge>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const promotion = row.original;
        if (promotion.status === "ROLLED_BACK") return <span className="text-xs text-muted-foreground">Rolled Back</span>;
        
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleRollback(promotion.id!)}
            disabled={rollingBackId === promotion.id}
          >
            {rollingBackId === promotion.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
            Rollback
          </Button>
        );
      }
    }
  ];

  return <DataTable columns={columns} data={data} />;
}

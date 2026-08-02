"use client";

import { FeeCategory } from "@/types/schema";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Archive } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";

interface FeeCategoryTableProps {
  data: FeeCategory[];
  onDelete: (id: string) => void;
  onEdit: (category: FeeCategory) => void;
}

export function FeeCategoryTable({ data, onDelete, onEdit }: FeeCategoryTableProps) {
  const columns: ColumnDef<FeeCategory>[] = [
    {
      accessorKey: "name",
      header: "Fee Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>
    },
    {
      accessorKey: "feeType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("feeType") as string;
        return <Badge variant="outline">{type.replace("_", " ")}</Badge>;
      }
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const category = row.original;
        if (category.isClassWise) {
          return <div className="font-medium text-muted-foreground">Class-wise (Varies)</div>;
        }
        const amount = parseFloat(row.getValue("amount"));
        return <div className="font-medium text-green-600">₹{amount.toFixed(2)}</div>;
      }
    },
    {
      accessorKey: "recurring",
      header: "Recurring",
      cell: ({ row }) => {
        const recurring = row.getValue("recurring") as boolean;
        return (
          <Badge variant={recurring ? "default" : "secondary"}>
            {recurring ? "Yes" : "No"}
          </Badge>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            // @ts-ignore
            variant={status === "ACTIVE" ? "success" : status === "ARCHIVED" ? "destructive" : "secondary"}
          >
            {status}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const category = row.original;
        const isActive = category.status === "ACTIVE";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem
                  onClick={() => onDelete(category.id as string)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  ];

  return <DataTable columns={columns} data={data} />;
}

"use client";

import { Notice } from "@/types/schema";
import { DataTable } from "@/components/table/DataTable";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Pin, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoticeFormClient } from "./NoticeFormClient";

interface NoticeTableProps {
  data: Notice[];
  isLoading: boolean;
  onDelete?: (id: string) => Promise<void>;
  baseRoute: string;
}

export function NoticeTable({ data, isLoading, onDelete, baseRoute }: NoticeTableProps) {
  const columns = [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }: { row: { original: Notice } }) => {
        const notice = row.original;
        return (
          <div className="flex items-center space-x-2">
            {notice.pinned && <Pin className="h-3 w-3 text-yellow-500" />}
            <span className="font-medium">{notice.title}</span>
          </div>
        );
      }
    },
    {
      header: "Target Roles",
      accessorKey: "targetRoles",
      cell: ({ row }: { row: { original: Notice } }) => {
        const targetRoles = row.original.targetRoles || [];
        return (
          <div className="flex flex-wrap gap-1">
            {targetRoles.length === 0 ? (
              <Badge variant="outline" className="text-xs">None</Badge>
            ) : (
              targetRoles.map(r => (
                <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
              ))
            )}
          </div>
        );
      }
    },
    {
      header: "Expiry Date",
      accessorKey: "expiryDate",
      cell: ({ row }: { row: { original: Notice } }) => format(row.original.expiryDate.toDate(), "MMM dd, yyyy")
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: { row: { original: Notice } }) => {
        const notice = row.original;
        return (
          <Badge variant={
            notice.status === "PUBLISHED" ? "default" :
            notice.status === "DRAFT" ? "secondary" :
            notice.status === "EXPIRED" ? "destructive" : "outline"
          }>
            {notice.status}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Notice } }) => {
        const notice = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <NoticeFormClient 
              initialData={notice} 
              onSuccess={() => window.location.reload()} 
              trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
            />
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(notice.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    }
  ];

  return (
    <DataTable
      columns={columns as any}
      data={data}
      searchKey="title"
    />
  );
}

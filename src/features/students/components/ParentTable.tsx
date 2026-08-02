"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Parent, Student } from "../types";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useMemo } from "react";

export const getParentColumns = (studentMap: Record<string, Student> = {}, onDelete?: (id: string) => void): ColumnDef<Parent>[] => [
  {
    accessorKey: "fatherName",
    header: "Father's Name",
    cell: ({ row }) => <span className="font-medium">{row.original.fatherName || 'N/A'}</span>
  },
  {
    accessorKey: "motherName",
    header: "Mother's Name",
    cell: ({ row }) => <span>{row.original.motherName || 'N/A'}</span>
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
  },
  {
    id: "children",
    header: "Children",
    cell: ({ row }) => {
      const studentIds = row.original.studentIds || [];
      return (
        <div className="flex flex-wrap gap-1">
          {studentIds.map(id => {
            const studentName = studentMap[id]?.name || "Unknown";
            return (
              <Badge key={id} variant="secondary" className="text-xs">
                {studentName}
              </Badge>
            );
          })}
        </div>
      );
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const parent = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/parents/${parent.parentId}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => onDelete && onDelete(parent.parentId)}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];

export function ParentTable({ data, students = [], onDelete }: { data: Parent[], students?: Student[], onDelete?: (id: string) => void }) {
  const studentMap = useMemo(() => {
    return students.reduce((acc, s) => ({ ...acc, [s.studentId]: s }), {} as Record<string, Student>);
  }, [students]);
  
  const columns = useMemo(() => getParentColumns(studentMap, onDelete), [studentMap, onDelete]);

  return (
    <DataTable 
      columns={columns} 
      data={data}
    />
  );
}

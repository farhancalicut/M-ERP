"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Student } from "../types";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Eye, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export const getStudentColumns = (classMap: Record<string, string> = {}, onDelete?: (id: string) => void): ColumnDef<Student>[] => [
  {
    accessorKey: "photoUrl",
    header: "Photo",
    cell: ({ row }) => (
      <Avatar className="h-8 w-8">
        <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
        <AvatarFallback>{row.original.name.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
    ),
  },
  {
    accessorKey: "admissionNo",
    header: "Adm No",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "classId",
    header: "Class",
    cell: ({ row }) => {
      const id = row.original.classId;
      return <span>{classMap[id] || id}</span>;
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
      const student = row.original;
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
              <Link href={`/students/${student.studentId}`}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/students/${student.studentId}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => onDelete && onDelete(student.studentId)}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];

import { useMemo } from "react";
import { Class } from "@/types/schema";

export function StudentTable({ data, classes = [], onDelete }: { data: Student[], classes?: Class[], onDelete?: (id: string) => void }) {
  const classMap = useMemo(() => {
    return classes.reduce((acc, c) => ({ ...acc, [c.id!]: c.name }), {} as Record<string, string>);
  }, [classes]);
  
  const columns = useMemo(() => getStudentColumns(classMap, onDelete), [classMap, onDelete]);

  const exportData = useMemo(() => {
    return data.map(s => ({
      'Register Number': s.admissionNo || '',
      'Name': s.name || '',
      'Gender': s.gender || '',
      'Date of Birth': s.dob || '',
      'Class': s.classId ? (classMap[s.classId] || s.classId) : '',
      'Status': s.status || 'ACTIVE'
    }));
  }, [data, classMap]);

  return (
    <DataTable 
      columns={columns} 
      data={data}
      exportFilename="Students_Report"
      exportData={exportData}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/schema";
import { staffService } from "@/features/staff/services/staffService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye } from "lucide-react";
import { ConfigureSalaryModal } from "@/features/finance/components/ConfigureSalaryModal";

import { classService } from "@/features/academic/services/classService";
import { salaryService } from "@/features/finance/services/salaryService";
import { Class, SalaryStructure } from "@/types/schema";

export default function StaffPage() {
  const [data, setData] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [salaries, setSalaries] = useState<Record<string, SalaryStructure>>({});
  const [loading, setLoading] = useState(true);
  const { userData } = useAuthStore();

  const loadData = async () => {
    if (!userData?.madrassaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [res, clsResponse, sals] = await Promise.all([
        staffService.getStaffMembers(userData.madrassaId),
        classService.getClasses(userData.madrassaId),
        salaryService.getAllSalaryStructures(userData.madrassaId)
      ]);
      setData(res);
      setClasses(clsResponse.classes);
      
      const salMap: Record<string, SalaryStructure> = {};
      sals.forEach(s => salMap[s.userId] = s);
      setSalaries(salMap);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.displayName}</span>
      )
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "contactNumber",
      header: "Phone",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge>{row.original.role}</Badge>
    },
    {
      id: "classes",
      header: "Assigned Classes",
      cell: ({ row }) => {
        const user = row.original;
        if (user.role !== "TEACHER") return <span className="text-muted-foreground">-</span>;
        
        if (!user.assignedClassIds || user.assignedClassIds.length === 0) {
          return (
            <Link href="/settings/classes">
              <Button variant="link" className="p-0 h-auto text-amber-600 font-medium">Assign Class</Button>
            </Link>
          );
        }
        const classNames = user.assignedClassIds.map(id => classes.find(c => c.id === id)?.name || "Unknown").join(", ");
        return <span className="text-sm">{classNames}</span>;
      }
    },
    {
      id: "salary",
      header: "Salary",
      cell: ({ row }) => {
        const user = row.original;
        const sal = salaries[user.uid];
        
        if (!sal || sal.baseSalary === undefined || sal.baseSalary === null || sal.baseSalary === 0) {
          return (
            <ConfigureSalaryModal 
              madrassaId={userData!.madrassaId}
              userId={user.uid}
              userName={user.displayName}
            />
          );
        }
        return <span className="text-sm font-medium">₹{sal.baseSalary}</span>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href={`/staff/${staff.uid}`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={`/staff/${staff.uid}/edit`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Staff</span>
                  </DropdownMenuItem>
                </Link>
                {userData?.madrassaId && (
                  <ConfigureSalaryModal 
                    madrassaId={userData.madrassaId}
                    userId={staff.uid}
                    userName={staff.displayName}
                    asDropdownItem
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage your institution's staff members</p>
        </div>
        <Link href="/staff/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Onboard Staff
          </Button>
        </Link>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">Loading...</div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="email" 
            searchPlaceholder="Search staff by email..." 
          />
        )}
      </div>
    </div>
  );
}

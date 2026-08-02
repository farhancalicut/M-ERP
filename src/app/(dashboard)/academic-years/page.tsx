"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { AcademicYear } from "@/types/schema";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";
import { toast } from "sonner";

export default function AcademicYearsPage() {
  const [data, setData] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuthStore();
  const router = useRouter();

  const loadData = async () => {
    if (!userData?.madrassaId) return;
    try {
      setLoading(true);
      const res = await academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50);
      setData(res.years);
    } catch (error) {
      toast.error(error instanceof AppError ? (error instanceof Error ? error.message : "") : "Failed to load academic years");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId]);

  const handleActivate = async (year: AcademicYear) => {
    if (!userData?.madrassaId) return;
    try {
      await academicYearService.activateAcademicYear(userData.madrassaId, year, userData.uid);
      toast.success("Academic year activated successfully");
      loadData(); // Reload to reflect status changes
    } catch (error: unknown) {
       toast.error((error instanceof Error ? error.message : "") || "Failed to activate");
    }
  };

  const columns: ColumnDef<AcademicYear>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => row.original.startDate ? format(row.original.startDate.toDate(), "MMM dd, yyyy") : "-"
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => row.original.endDate ? format(row.original.endDate.toDate(), "MMM dd, yyyy") : "-"
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const color = status === "ACTIVE" ? "bg-green-100 text-green-800" 
                    : status === "UPCOMING" ? "bg-blue-100 text-blue-800"
                    : status === "COMPLETED" ? "bg-gray-100 text-gray-800"
                    : "bg-red-100 text-red-800";
        return <Badge variant="secondary" className={color}>{status}</Badge>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const year = row.original;
        return (
          <div className="flex gap-2 justify-end">
             {year.status === "UPCOMING" && (
                <Button variant="outline" size="sm" onClick={() => handleActivate(year)}>
                  Activate
                </Button>
             )}
             <Button variant="outline" size="sm" onClick={() => router.push(`/academic-years/${year.id}/edit`)}>
               Edit
             </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Years</h1>
          <p className="text-muted-foreground">Manage academic sessions for your madrassa</p>
        </div>
        <Link href="/academic-years/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Academic Year
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
            searchKey="name" 
            searchPlaceholder="Search academic years..." 
          />
        )}
      </div>
    </div>
  );
}

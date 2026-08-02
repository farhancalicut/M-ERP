"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Exam } from "@/types/schema";
import { examService } from "@/features/exams/services/examService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";

export default function ExamsDashboardPage() {
  const [data, setData] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const { userData, currentAcademicYear } = useAuthStore();
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const router = useRouter();

  useEffect(() => {
    const fetchYears = async () => {
      if (!userData?.madrassaId) return;
      try {
        const res = await academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50);
        setAcademicYears(res.years);
      } catch {}
    };
    fetchYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId]);

  const loadData = async () => {
    if (!userData?.madrassaId || !selectedYearId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await examService.getExams(userData.madrassaId, selectedYearId, "ALL", undefined, 50);
      setData(res.exams);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, selectedYearId]);

  const handleArchive = async (exam: Exam) => {
    if (!userData?.madrassaId) return;
    if (!confirm("Are you sure you want to archive this exam?")) return;
    
    try {
      await examService.archiveExam(exam.id as string, userData.uid);
      toast.success("Exam archived successfully");
      loadData();
    } catch (error: unknown) {
       toast.error(error instanceof Error ? error.message : "Failed to archive exam");
    }
  };

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: "name",
      header: "Exam Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>
    },
    {
      accessorKey: "examType",
      header: "Type",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => format(row.original.startDate.toDate(), "dd MMM yyyy")
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => format(row.original.endDate.toDate(), "dd MMM yyyy")
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let color = "bg-gray-100 text-gray-800";
        if (status === "ACTIVE") color = "bg-green-100 text-green-800";
        if (status === "COMPLETED") color = "bg-blue-100 text-blue-800";
        return <Badge variant="secondary" className={color}>{status}</Badge>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <div className="flex gap-2 justify-end">
             <Button variant="outline" size="sm" onClick={() => router.push(`/exams/${exam.id}/edit`)}>
               {exam.status === 'ARCHIVED' ? 'View' : 'Edit'}
             </Button>
             {exam.status !== "ARCHIVED" && (
                <Button variant="outline" size="sm" onClick={() => handleArchive(exam)}>
                  Archive
                </Button>
             )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">Manage examinations, subjects, and schedules</p>
        </div>
        <Link href={`/exams/new?yearId=${selectedYearId}`}>
          <Button disabled={!selectedYearId || userData?.role === "TEACHER"}>
            <Plus className="mr-2 h-4 w-4" />
            New Exam
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Academic Year:</span>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Academic Year" />
          </SelectTrigger>
          <SelectContent>
             {academicYears.map(yr => (
               <SelectItem key={yr.id} value={yr.id as string}>{yr.name} ({yr.status})</SelectItem>
             ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">Loading...</div>
        ) : !selectedYearId ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">Select an academic year first</div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="name" 
            searchPlaceholder="Search exams..." 
          />
        )}
      </div>
    </div>
  );
}

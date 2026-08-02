"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Subject } from "@/types/schema";
import { subjectService } from "@/features/academic/services/subjectService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear, Class } from "@/types/schema";
import { classService } from "@/features/academic/services/classService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SubjectForm } from "@/features/academic/components/SubjectForm";
import { SubjectFormData } from "@/features/academic/schemas/academicSchemas";
import { Status } from "@/types/enums";

export default function SubjectsPage() {
  const [data, setData] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const { userData, currentAcademicYear } = useAuthStore();
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const router = useRouter();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    const fetchYearsAndClasses = async () => {
      if (!userData?.madrassaId) return;
      try {
        const [res, classesRes] = await Promise.all([
          academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50),
          classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100)
        ]);
        setAcademicYears(res.years);
        setClasses(classesRes.classes);
      } catch {}
    };
    fetchYearsAndClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId]);

  const loadData = async () => {
    if (!userData?.madrassaId || !selectedYearId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await subjectService.getSubjects(userData.madrassaId, "ALL", undefined, 50);
      setData(res.subjects);
    } catch (error) {
      toast.error(error instanceof AppError ? (error instanceof Error ? error.message : "") : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, selectedYearId]);

  const handleArchive = async (sub: Subject) => {
    if (!userData?.madrassaId) return;
    if (!confirm("Are you sure you want to archive this subject?")) return;
    
    try {
      await subjectService.archiveSubject(sub.id!, userData.madrassaId, userData.uid!);
      toast.success("Subject archived successfully");
      loadData();
    } catch (error: unknown) {
       toast.error((error instanceof Error ? error.message : "") || "Failed to archive subject");
    }
  };

  const handleFormSubmit = async (data: SubjectFormData) => {
    if (!userData?.madrassaId || !userData?.uid) return;
    if (!selectedYearId) {
      setFormError("No academic year selected");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError(undefined);
      
      if (editingSubject) {
        await subjectService.updateSubject(editingSubject.id as string, {
          name: data.name,
          code: data.code,
          displayOrder: data.displayOrder,
          classIds: data.classIds || [],
          defaultTotalMarks: data.defaultTotalMarks,
          defaultPassMarks: data.defaultPassMarks,
          madrassaId: editingSubject.madrassaId,
        }, userData.uid);
        toast.success("Subject updated successfully");
      } else {
        await subjectService.createSubject({
          madrassaId: userData.madrassaId,
          name: data.name,
          code: data.code,
          displayOrder: data.displayOrder,
          classIds: data.classIds || [],
          defaultTotalMarks: data.defaultTotalMarks,
          defaultPassMarks: data.defaultPassMarks,
          status: "ACTIVE" as Status,
        }, userData.uid);
        toast.success("Subject created successfully");
      }
      
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError((err instanceof Error ? err.message : "") || "Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Subject Name",
    },
    {
      accessorKey: "displayOrder",
      header: "Order",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const color = status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
        return <Badge variant="secondary" className={color}>{status}</Badge>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex gap-2 justify-end">
             <Button variant="outline" size="sm" onClick={() => {
               setEditingSubject(sub);
               setFormError(undefined);
               setIsModalOpen(true);
             }}>
               Edit
             </Button>
             {sub.status !== "ARCHIVED" && (
                <Button variant="outline" size="sm" onClick={() => handleArchive(sub)}>
                  Archive
                </Button>
             )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">Manage subjects for the academic year</p>
        </div>
        <Button disabled={!selectedYearId} onClick={() => {
          setEditingSubject(null);
          setFormError(undefined);
          setIsModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Subject
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Academic Year:</span>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Academic Year" />
          </SelectTrigger>
          <SelectContent>
             {academicYears.map(yr => (
               <SelectItem key={yr.id!} value={yr.id!}>{yr.name} ({yr.status})</SelectItem>
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
            searchPlaceholder="Search subjects..." 
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubject ? "Edit Subject" : "New Subject"}</DialogTitle>
            <DialogDescription>
              {editingSubject ? "Update subject settings." : "Create a new subject for the academic year."}
            </DialogDescription>
          </DialogHeader>
          <SubjectForm
            classes={classes}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            error={formError}
            defaultValues={editingSubject ? ({
              name: editingSubject.name,
              code: editingSubject.code,
              displayOrder: editingSubject.displayOrder,
              classIds: editingSubject.classIds || [],
              defaultTotalMarks: editingSubject.defaultTotalMarks,
              defaultPassMarks: editingSubject.defaultPassMarks,
            } as any) : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

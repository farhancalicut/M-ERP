"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Class } from "@/types/schema";
import { classService } from "@/features/academic/services/classService";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear, User } from "@/types/schema";
import { staffService } from "@/features/staff/services/staffService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClassForm } from "@/features/academic/components/ClassForm";
import { ClassFormData } from "@/features/academic/schemas/academicSchemas";
import { STANDARD_CLASSES } from "@/constants/academic";
import { Status } from "@/types/enums";
import { deleteField, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

export default function ClassesPage() {
  const [data, setData] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Record<string, User>>({});
  const { userData, currentAcademicYear } = useAuthStore();
  const [selectedYearId, setSelectedYearId] = useState<string>(currentAcademicYear?.id || "");
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [navigatingNext, setNavigatingNext] = useState(false);

  useEffect(() => {
    if (!selectedYearId && currentAcademicYear?.id) {
      setSelectedYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear, selectedYearId]);

  useEffect(() => {
    const fetchYears = async () => {
      if (!userData?.madrassaId) return;
      try {
        const [res, staff] = await Promise.all([
          academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50),
          staffService.getStaffMembers(userData.madrassaId)
        ]);
        
        setAcademicYears(res.years);
        
        const teacherMap: Record<string, User> = {};
        staff.forEach(s => {
          teacherMap[s.id as string] = s;
        });
        setTeachers(teacherMap);
        
        // Fallback: if selectedYearId is still empty, pick the active year or first available
        if (!selectedYearId && res.years.length > 0) {
          const activeYear = res.years.find(y => y.status === "ACTIVE") || res.years[0];
          setSelectedYearId(activeYear!.id as string);
        }
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
      const res = await classService.getClasses(userData.madrassaId, "ALL", undefined, 50);
      setData(res.classes);
    } catch (error) {
      toast.error(error instanceof AppError ? (error instanceof Error ? error.message : "") : "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, selectedYearId]);

  const handleArchive = async (cls: Class) => {
    if (!userData?.madrassaId) return;
    if (!confirm("Are you sure you want to archive this class?")) return;
    
    try {
      await classService.archiveClass(cls.id as string, userData.madrassaId, userData.uid);
      toast.success("Class archived successfully");
      loadData();
    } catch (error: unknown) {
       toast.error((error instanceof Error ? error.message : "") || "Failed to archive class");
    }
  };

  const handleDelete = async (cls: Class) => {
    if (!userData?.madrassaId) return;
    if (!confirm(`WARNING: Are you absolutely sure you want to delete ${cls.name}? This action cannot be undone and will permanently remove this class.`)) return;
    
    try {
      await classService.deleteClass(cls.id as string, userData.madrassaId);
      toast.success("Class deleted successfully");
      loadData();
    } catch (error: unknown) {
       toast.error((error instanceof Error ? error.message : "") || "Failed to delete class");
    }
  };

  const handleFormSubmit = async (formData: ClassFormData) => {
    if (!userData?.madrassaId || !userData?.uid) return;
    if (!selectedYearId) {
      setFormError("No academic year selected");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(undefined);

      const stdClass = STANDARD_CLASSES.find(c => c.id === formData.globalClassId);
      if (!stdClass) {
        setFormError("Invalid standard class selected");
        return;
      }

      let computedName = stdClass.name;
      if (formData.division && formData.division.trim().length > 0) {
        computedName = `${stdClass.name} - ${formData.division.trim().toUpperCase()}`;
      }

      if (editingClass) {
        const updateData: Partial<Class> = {
          globalClassId: formData.globalClassId,
          division: formData.division || "",
          name: computedName,
          displayOrder: formData.displayOrder,
          isAlumni: formData.isAlumni || false,
          classTeacherId: formData.classTeacherId || deleteField() as unknown as string,
        };
        await classService.updateClass(editingClass.id as string, updateData, userData.uid);
        toast.success("Class updated successfully");
      } else {
        const payload: any = {
          madrassaId: userData.madrassaId,
          globalClassId: formData.globalClassId,
          division: formData.division || "",
          name: computedName,
          displayOrder: formData.displayOrder,
          currentStrength: 0,
          isAlumni: formData.isAlumni || false,
          status: "ACTIVE" as Status,
        };
        if (formData.classTeacherId) {
          payload.classTeacherId = formData.classTeacherId;
        }
        await classService.createClass(payload, userData.uid);
        toast.success("Class created successfully");
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError((err instanceof Error ? err.message : "") || "Failed to save class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Class>[] = [
    {
      accessorKey: "name",
      header: "Class Name",
    },
    {
      accessorKey: "displayOrder",
      header: "Display / Promotion Order",
    },
    {
      accessorKey: "currentStrength",
      header: "Current Strength",
      cell: ({ row }) => <span className="font-medium">{row.original.currentStrength || 0}</span>
    },
    {
      id: "classTeacher",
      header: "Class Teacher",
      cell: ({ row }) => {
        const teacherId = row.original.classTeacherId;
        if (!teacherId || !teachers[teacherId]) return <span className="text-muted-foreground italic">None</span>;
        return <span>{teachers[teacherId].displayName}</span>;
      }
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
        const cls = row.original;
        return (
          <div className="flex gap-2 justify-end">
             <Button variant="outline" size="sm" onClick={() => {
               setEditingClass(cls);
               setFormError(undefined);
               setIsModalOpen(true);
             }}>
               Edit
             </Button>
             {cls.status !== "ARCHIVED" && (
                <Button variant="outline" size="sm" onClick={() => handleArchive(cls)}>
                  Archive
                </Button>
             )}
             <Button variant="destructive" size="sm" onClick={() => handleDelete(cls)}>
               Delete
             </Button>
          </div>
        );
      }
    }
  ];

  const exportData = data.map(cls => ({
    'Class Name': cls.name,
    'Display Order': cls.displayOrder,
    'Current Strength': cls.currentStrength || 0,
    'Class Teacher': cls.classTeacherId && teachers[cls.classTeacherId] ? teachers[cls.classTeacherId]?.displayName : 'None',
    'Status': cls.status
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Manage classes and capacities</p>
        </div>
        <Button disabled={!selectedYearId} onClick={() => {
          setEditingClass(null);
          setFormError(undefined);
          setIsModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Class
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Academic Year:</span>
        <Select value={selectedYearId || ""} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[200px]">
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
            searchPlaceholder="Search classes..." 
            exportFilename="Classes_Report"
            exportData={exportData}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "New Class"}</DialogTitle>
            <DialogDescription>
              {editingClass ? "Update class settings." : "Create a new class for the academic year."}
            </DialogDescription>
          </DialogHeader>
          <ClassForm
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            error={formError}
            defaultValues={editingClass ? ({
              globalClassId: editingClass.globalClassId,
              division: editingClass.division || "",
              displayOrder: editingClass.displayOrder,
              isAlumni: editingClass.isAlumni || false,
              classTeacherId: editingClass.classTeacherId,
            } as any) : undefined}
          />
        </DialogContent>
      </Dialog>
      {userData?.madrassaId && useAuthStore.getState().madrassa?.isSetupComplete === false && (
        <div className="flex justify-end mt-8 pt-4 border-t">
          <Button type="button" onClick={() => { setNavigatingNext(true); router.push("/settings/subjects"); }} disabled={navigatingNext}>
            {navigatingNext ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {navigatingNext ? "Loading..." : "Save & Continue"} {!navigatingNext && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

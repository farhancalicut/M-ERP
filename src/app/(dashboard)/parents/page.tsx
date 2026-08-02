"use client";

import { useState, useEffect, useCallback } from "react";
import { ParentTable } from "@/features/students/components/ParentTable";
import { parentService } from "@/features/students/services/parentService";
import { studentService } from "@/features/students/services/studentService";
import { Parent, Student } from "@/features/students/types";
import { useAuthStore } from "@/stores/authStore";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

export default function ParentsPage() {
  const { userData } = useAuthStore();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchParents = useCallback(async (search: string) => {
    if (!userData?.madrassaId) return;
    setLoading(true);
    try {
      const result = await parentService.searchParents(userData.madrassaId, { search });
      setParents(result.parents);
      
      const allStudentIds = new Set<string>();
      result.parents.forEach(p => {
        p.studentIds?.forEach(id => allStudentIds.add(id));
      });
      
      if (allStudentIds.size > 0) {
        const studentsData = await studentService.getStudentsByIds(userData.madrassaId, Array.from(allStudentIds));
        setStudents(studentsData);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userData?.madrassaId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParents(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchParents, searchTerm]);

  const handleDelete = async (parentId: string) => {
    if (!userData?.id || !userData?.madrassaId) return;
    
    if (confirm("Are you sure you want to delete this parent?")) {
      try {
        await parentService.softDeleteParent(parentId, userData.id);
        toast.success("Parent deleted successfully");
        fetchParents(searchTerm); // Refresh
      } catch (error: any) {
        toast.error("Failed to delete parent");
      }
    }
  };

  return (
    <RoleGuard allowedRoles={["MANAGEMENT", "PRINCIPAL"]}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parents</h1>
            <p className="text-muted-foreground mt-1">Manage parent and guardian profiles.</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or mobile..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading parents...</div>
        ) : (
          <ParentTable data={parents} students={students} onDelete={handleDelete} />
        )}
      </div>
    </RoleGuard>
  );
}

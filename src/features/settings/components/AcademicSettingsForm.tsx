"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export function AcademicSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [newYearName, setNewYearName] = useState("");
  const [newYearStartDate, setNewYearStartDate] = useState("");
  const [newYearEndDate, setNewYearEndDate] = useState("");
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const yearsRes = await academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50);
          setYears(yearsRes.years);
        } catch (error: any) {
          console.error("Failed to load academic data:", error);
          toast.error(error?.message || "Failed to load academic data");
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [userData?.madrassaId]);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim() || !newYearStartDate || !newYearEndDate || !userData?.madrassaId || !userData?.id) return;
    
    const start = new Date(newYearStartDate);
    const end = new Date(newYearEndDate);

    if (start >= end) {
      toast.error("End date must be after start date");
      return;
    }

    // Check for overlap
    const hasOverlap = years.some(year => {
      const yearStart = (year.startDate as any).toDate();
      const yearEnd = (year.endDate as any).toDate();
      // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
      return (start <= yearEnd) && (end >= yearStart);
    });

    if (hasOverlap) {
      toast.error("Academic year dates cannot overlap with an existing year");
      return;
    }

    setIsSubmittingYear(true);
    try {
      const newYear = await academicYearService.createAcademicYear({
        madrassaId: userData.madrassaId,
        name: newYearName.trim(),
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: "UPCOMING",
        isCurrent: false,
      }, userData.id);
      
      setYears([newYear, ...years]);
      setNewYearName("");
      setNewYearStartDate("");
      setNewYearEndDate("");
      toast.success("Academic year added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add academic year");
    } finally {
      setIsSubmittingYear(false);
    }
  };



  const activateYear = async (year: AcademicYear) => {
    if (!userData?.madrassaId || !userData?.id) return;
    try {
      await academicYearService.activateAcademicYear(userData.madrassaId, year, userData.id);
      toast.success("Academic year activated");
      // Update local state
      setYears(years.map(y => ({
        ...y,
        status: y.id === year.id ? "ACTIVE" : (y.status === "ACTIVE" ? "COMPLETED" : y.status),
        isCurrent: y.id === year.id
      })));
    } catch (error: any) {
      toast.error(error.message || "Failed to activate year");
    }
  };

  const deleteYear = async (year: AcademicYear) => {
    if (!userData?.madrassaId || !userData?.id) return;
    if (!window.confirm(`Are you sure you want to delete the academic year "${year.name}"?`)) return;
    try {
      await academicYearService.deleteAcademicYear(year.id!);
      setYears(years.filter(y => y.id !== year.id));
      toast.success("Academic year deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete year");
    }
  };


  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Academic Years Section */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Years</CardTitle>
          <CardDescription>Manage academic years for your institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddYear} className="flex flex-col gap-4 mb-6 md:flex-row md:items-end">
            <div className="space-y-1">
              <Label>Year Name</Label>
              <Input 
                placeholder="e.g. 2024-2025" 
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                className="w-full md:w-48"
              />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input 
                type="date"
                value={newYearStartDate}
                onChange={(e) => setNewYearStartDate(e.target.value)}
                className="w-full md:w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input 
                type="date"
                value={newYearEndDate}
                onChange={(e) => setNewYearEndDate(e.target.value)}
                className="w-full md:w-40"
              />
            </div>
            <Button type="submit" disabled={isSubmittingYear || !newYearName.trim() || !newYearStartDate || !newYearEndDate}>
              {isSubmittingYear ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Year
            </Button>
          </form>

          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {years.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No academic years found.</td>
                  </tr>
                ) : (
                  years.map((year) => (
                    <tr key={year.id} className="border-t">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {year.name}
                        {year.status === "ACTIVE" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          year.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                          year.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {year.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {year.status !== "ACTIVE" && (
                          <Button variant="outline" size="sm" onClick={() => activateYear(year)}>
                            Set Active
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteYear(year)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

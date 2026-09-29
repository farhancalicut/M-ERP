"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { AcademicYear } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, Trash2, CheckSquare, ArrowRight } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function AcademicSettingsForm() {
  const { userData, madrassa } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [navigatingNext, setNavigatingNext] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [newYearName, setNewYearName] = useState("");
  const [newYearStartDate, setNewYearStartDate] = useState("");
  const [newYearEndDate, setNewYearEndDate] = useState("");
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  // Finish Year Dialog State
  const [finishingYear, setFinishingYear] = useState<AcademicYear | null>(null);
  const [confirmMarks, setConfirmMarks] = useState(false);
  const [confirmAttendance, setConfirmAttendance] = useState(false);
  const [confirmFees, setConfirmFees] = useState(false);

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



  const handleFinishYearClick = (year: AcademicYear) => {
    setFinishingYear(year);
    setConfirmMarks(false);
    setConfirmAttendance(false);
    setConfirmFees(false);
  };

  const confirmFinishYear = async () => {
    if (!finishingYear || !userData?.madrassaId || !userData?.id) return;
    
    // Find the next upcoming year to activate
    const upcomingYears = years.filter(y => y.status === "UPCOMING").sort((a, b) => (a.startDate as any).toMillis() - (b.startDate as any).toMillis());
    const nextYear = (upcomingYears.length > 0 ? upcomingYears[0] : null) as AcademicYear | null;

    try {
      await academicYearService.finishAcademicYear(userData.madrassaId, finishingYear.id!, nextYear, userData.id);
      toast.success("Academic year finished successfully!");
      
      // Update local state
      const updatedYears = years.map(y => {
        if (y.id === finishingYear.id) {
          return { ...y, status: "COMPLETED" as const, isCurrent: false };
        }
        if (nextYear && y.id === nextYear.id) {
          return { ...y, status: "ACTIVE" as const, isCurrent: true };
        }
        return y;
      });
      setYears(updatedYears);
      
      if (nextYear) {
        useAuthStore.getState().setCurrentAcademicYear({ id: nextYear.id!, name: nextYear.name });
      } else {
        useAuthStore.getState().setCurrentAcademicYear(null);
      }
      
      setFinishingYear(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to finish year");
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
                        {year.status === "ACTIVE" && (
                          <Button variant="outline" size="sm" onClick={() => handleFinishYearClick(year)}>
                            <CheckSquare className="mr-2 h-4 w-4 text-blue-500" />
                            Finish Current Year
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

      <Dialog open={!!finishingYear} onOpenChange={(open) => !open && setFinishingYear(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Current Academic Year</DialogTitle>
            <DialogDescription>
              Are you sure you want to finish the academic year <strong>{finishingYear?.name}</strong>?
              This will lock the current year's records and prepare the system for the next year.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm font-medium">Please confirm the following:</p>
            <div className="flex items-start space-x-3">
              <Checkbox id="chk-marks" checked={confirmMarks} onCheckedChange={(val) => setConfirmMarks(!!val)} />
              <Label htmlFor="chk-marks" className="leading-snug">All final exam marks have been entered and verified.</Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="chk-attendance" checked={confirmAttendance} onCheckedChange={(val) => setConfirmAttendance(!!val)} />
              <Label htmlFor="chk-attendance" className="leading-snug">All attendance records for the year are complete.</Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="chk-fees" checked={confirmFees} onCheckedChange={(val) => setConfirmFees(!!val)} />
              <Label htmlFor="chk-fees" className="leading-snug">All fee collections have been reconciled.</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishingYear(null)}>Cancel</Button>
            <Button 
              variant="default" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!confirmMarks || !confirmAttendance || !confirmFees} 
              onClick={confirmFinishYear}
            >
              Finish Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {madrassa?.isSetupComplete === false && (
        <div className="flex justify-end mt-8 pt-4 border-t">
          <Button type="button" onClick={() => { setNavigatingNext(true); router.push("/settings/classes"); }} disabled={navigatingNext}>
            {navigatingNext ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {navigatingNext ? "Loading..." : "Save & Continue"} {!navigatingNext && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

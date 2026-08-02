"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Building, Info, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { studentService } from "@/features/students/services/studentService";
import { FeeCategory } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GenerateTuitionModalProps {
  madrassaId: string;
  classId: string;
  className: string;
  academicYearId: string;
  academicYearName?: string;
  onSuccess?: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function GenerateTuitionModal({
  madrassaId,
  classId,
  className,
  academicYearId,
  academicYearName,
  onSuccess
}: GenerateTuitionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [month, setMonth] = useState<string>(new Date().getMonth().toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const handleGenerate = async () => {
    if (!academicYearId) return;
    try {
      setIsLoading(true);
      const feesResponse = await feeCategoryService.getFeeCategories(madrassaId, { status: "ACTIVE" }, 100);
      let applicableCategories = feesResponse.categories.filter(c => c.recurring === true);

      applicableCategories = applicableCategories.filter(cat => {
        if (cat.isClassWise) {
          if (classId === "ALL") return true;
          const classAmount = cat.classAmounts?.[classId];
          return classAmount !== undefined && classAmount > 0;
        }
        return cat.amount > 0;
      });

      if (applicableCategories.length === 0) {
        toast.error("No recurring fee categories found.");
        return;
      }

      let totalGenerated = 0;
      for (const category of applicableCategories) {
        const count = await studentFeeService.generateMonthlyFees(
          madrassaId,
          academicYearId,
          classId === "ALL" ? null : classId,
          category,
          parseInt(month),
          parseInt(year)
        );
        totalGenerated += count;
      }

      if (totalGenerated > 0) {
        toast.success(`Successfully generated fees for students.`);
      } else {
        toast.info("No active students found, or fees were already generated.");
      }
      
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate fees");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button className="bg-[#b38b36] hover:bg-[#9c782b] text-white shadow-sm font-semibold h-10 px-4">
          Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select Billing Cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <p className="text-sm text-muted-foreground">
            Select the billing cycle month and year to generate recurring fees (like Tuition) for all active students in <strong>{className}</strong>.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <div className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-slate-700 items-center font-medium shadow-sm">
                {academicYearName || academicYearId || year}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleGenerate} disabled={isLoading} className="bg-teal-800 hover:bg-teal-900 w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

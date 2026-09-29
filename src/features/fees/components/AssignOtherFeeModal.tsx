"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { FeeCategory } from "@/types/schema";
import { toast } from "sonner";

interface AssignOtherFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, assigns fee to a single student */
  studentId?: string;
  studentName?: string;
  /** If provided, assigns fee to all students in this class */
  classStudentIds?: string[];
  className?: string;
  madrassaId: string;
  academicYearId: string;
  onSuccess: () => void;
}

export function AssignOtherFeeModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  classStudentIds,
  className,
  madrassaId,
  academicYearId,
  onSuccess,
}: AssignOtherFeeModalProps) {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDone(false);
    setSelectedCatId("");
    setCustomAmount("");
    setDueDate("");
    const load = async () => {
      try {
        setLoadingCats(true);
        // Only show non-recurring categories (tuition is recurring, others are one-off)
        const res = await feeCategoryService.getFeeCategories(madrassaId, { status: "ACTIVE" }, 100);
        const nonRecurring = res.categories.filter(c => !c.recurring);
        setCategories(nonRecurring);
      } catch {
        toast.error("Failed to load fee categories");
      } finally {
        setLoadingCats(false);
      }
    };
    load();
  }, [isOpen, madrassaId]);

  const selectedCat = categories.find(c => c.id === selectedCatId);

  const handleSubmit = async () => {
    if (!selectedCatId || !selectedCat) {
      toast.error("Please select a fee category.");
      return;
    }
    const amount = customAmount ? parseFloat(customAmount) : selectedCat.amount;
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const overriddenCat: FeeCategory = { ...selectedCat, amount };
    const due = dueDate ? new Date(dueDate) : undefined;

    try {
      setSubmitting(true);
      if (studentId) {
        // Single student
        await studentFeeService.assignFee(madrassaId, studentId, academicYearId, overriddenCat, undefined, due);
      } else if (classStudentIds && classStudentIds.length > 0) {
        // All students in class
        await studentFeeService.assignBulkFee(madrassaId, academicYearId, classStudentIds, overriddenCat, undefined, due);
      }
      setDone(true);
      toast.success("Fee assigned successfully!");
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign fee.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBulk = !studentId && !!classStudentIds?.length;
  const targetLabel = studentId ? studentName : `${className} (${classStudentIds?.length} students)`;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Assign Fee
          </DialogTitle>
          <DialogDescription>
            Assign a one-time fee to{" "}
            <span className="font-semibold text-foreground">{targetLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3 text-green-600">
            <CheckCircle2 className="h-12 w-12" />
            <p className="font-semibold text-base">Fee assigned successfully!</p>
          </div>
        ) : loadingCats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No one-time fee categories found.</p>
            <p className="mt-1">Go to <strong>Settings → Fee Management</strong> to create non-recurring fee categories (e.g. Book Fee, Admission Fee).</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fee Category</Label>
              <Select value={selectedCatId} onValueChange={v => {
                setSelectedCatId(v);
                const cat = categories.find(c => c.id === v);
                if (cat) setCustomAmount(cat.amount.toString());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fee type..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id as string} value={cat.id as string}>
                      {cat.name}
                      {cat.amount > 0 && (
                        <span className="ml-2 text-muted-foreground text-xs">— Rs.{cat.amount.toLocaleString("en-IN")}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCat?.description && (
                <p className="text-xs text-muted-foreground">{selectedCat.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Amount (Rs.)</Label>
              <Input
                type="number"
                placeholder={selectedCat ? selectedCat.amount.toString() : "Enter amount"}
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">You can override the default amount for this assignment.</p>
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {!done && categories.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !selectedCatId || loadingCats}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBulk ? `Assign to ${classStudentIds?.length} Students` : "Assign Fee"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

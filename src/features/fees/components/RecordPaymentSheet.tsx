"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { classService } from "@/features/academic/services/classService";
import { Student, StudentFee, Class } from "@/types/schema";
import { toast } from "sonner";
import { Loader2, Banknote, Landmark, Smartphone, CreditCard, AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import { waiverService } from "@/features/fees/services/waiverService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RecordPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  academicYearId: string;
}

export function RecordPaymentSheet({ isOpen, onClose, studentId, academicYearId }: RecordPaymentSheetProps) {
  const { userData } = useAuthStore();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [feeSummary, setFeeSummary] = useState<StudentFee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedFeeId, setSelectedFeeId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI">("CASH");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverAmount, setWaiverAmount] = useState("");
  const [isWaiving, setIsWaiving] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId || !academicYearId || !userData?.madrassaId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [studentData, summaryData] = await Promise.all([
          studentService.getStudent(studentId),
          studentFeeService.getStudentFees(studentId, academicYearId),
        ]);

        if (studentData?.classId) {
          const classData = await classService.getClass(studentData.classId);
          setStudentClass(classData);
        }

        setStudent(studentData);
        setFeeSummary(summaryData);
        
        // Auto-select first outstanding fee
        const outstanding = summaryData?.assignedFees?.filter(f => f.status !== "PAID" && f.status !== "CANCELLED" && f.status !== "WAIVED") || [];
        if (outstanding.length > 0) {
          setSelectedFeeId(outstanding[0]!.id as string);
          setAmount(outstanding[0]!.dueAmount.toString());
        } else {
          setSelectedFeeId("");
          setAmount("");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, studentId, academicYearId, userData?.madrassaId]);

  const assignedFees = feeSummary?.assignedFees || [];
  const outstandingFees = assignedFees.filter(f => f.status !== "PAID" && f.status !== "CANCELLED" && f.status !== "WAIVED");
  const selectedFee = outstandingFees.find(f => f.id === selectedFeeId);

  const handleFeeSelect = (feeId: string) => {
    setSelectedFeeId(feeId);
    if (feeId === "DONATION") {
      setAmount("");
      return;
    }
    const fee = outstandingFees.find(f => f.id === feeId);
    if (fee) {
      setAmount(fee.dueAmount.toString());
    }
  };

  const handleCollect = async () => {
    if (!userData || !academicYearId || !student || !selectedFeeId) return;
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const isDonation = selectedFeeId === "DONATION";
    if (!isDonation && selectedFee && numAmount > selectedFee.dueAmount) {
      toast.error(`Amount cannot exceed the due amount of ₹${selectedFee.dueAmount}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await paymentService.collectPayment(
        userData.madrassaId,
        studentId,
        student.parentId,
        academicYearId,
        isDonation ? "DONATION" : selectedFee!.feeCategoryId,
        isDonation ? "DONATION" : selectedFee!.id as string,
        numAmount,
        paymentMethod as any,
        userData.uid,
        userData.role,
        remarks,
        new Date(paymentDate)
      );
      toast.success("Payment recorded successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canWaive = userData?.role === "MANAGEMENT" || userData?.role === "PRINCIPAL";

  const handleWaive = async () => {
    if (!selectedFee || !userData?.uid) return;
    if (!waiverReason.trim()) { toast.error("Please provide a reason for the waiver."); return; }
    const wAmount = waiverAmount ? parseFloat(waiverAmount) : undefined;
    try {
      setIsWaiving(true);
      await waiverService.waiveFee(
        studentId,
        academicYearId,
        selectedFee.id as string,
        userData.uid,
        waiverReason,
        wAmount
      );
      toast.success("Fee waived successfully!");
      setShowWaiverDialog(false);
      setWaiverReason("");
      setWaiverAmount("");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to waive fee");
    } finally {
      setIsWaiving(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white dark:bg-slate-900">
        <DialogHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Record Payment</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
            {student ? `For ${student.name} (${studentClass?.name || "Grade " + student.classId})` : "Loading student details..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !student ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-700 dark:text-teal-500" />
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-5">
            
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Fee to Pay</Label>
              <Select value={selectedFeeId} onValueChange={handleFeeSelect}>
                <SelectTrigger className="w-full font-medium h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <SelectValue placeholder="Select a fee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DONATION" className="font-bold text-teal-600 dark:text-teal-400">
                    Donate / Custom Payment
                  </SelectItem>
                  {outstandingFees.length > 0 && (
                    outstandingFees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id as string} className="font-medium">
                        {fee.feeName} — ₹{fee.dueAmount.toLocaleString()} due
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Amount (Rs.)</Label>
                <Input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 font-semibold text-slate-800 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700"
                />
                {selectedFee && parseFloat(amount) > 0 && parseFloat(amount) < selectedFee.dueAmount && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Partial payment — Rs.{(selectedFee.dueAmount - parseFloat(amount)).toFixed(2)} will remain due
                  </p>
                )}
                {selectedFee && parseFloat(amount) === selectedFee.dueAmount && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Full payment
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Date</Label>
                <Input 
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-11 font-medium text-slate-800 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Payment Method</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "CASH", label: "Cash", icon: Banknote },
                  { id: "BANK_TRANSFER", label: "Bank", icon: Landmark },
                  { id: "UPI", label: "UPI", icon: Smartphone },
                  { id: "CHEQUE", label: "Cheque", icon: CreditCard }
                ].map(method => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`border rounded-lg p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === method.id 
                        ? "border-teal-700 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400" 
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="font-bold text-[10px] uppercase">{method.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Remarks (Optional)</Label>
              <Textarea 
                placeholder="Notes..." 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="resize-none h-20 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-sm"
              />
            </div>

          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="font-semibold h-11 w-full sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </Button>
          {canWaive && selectedFee && selectedFeeId !== "DONATION" && (
            <Button 
              variant="outline"
              onClick={() => setShowWaiverDialog(true)}
              disabled={isSubmitting}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 font-semibold h-11 w-full sm:w-auto"
            >
              <MinusCircle className="mr-2 h-4 w-4" /> Waive Fee
            </Button>
          )}
          <Button 
            onClick={handleCollect} 
            disabled={isSubmitting || !selectedFeeId}
            className="bg-teal-700 hover:bg-teal-800 text-white shadow-sm font-semibold h-11 w-full sm:w-auto px-8"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Waiver Dialog */}
    {showWaiverDialog && (
      <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Waive Fee</DialogTitle>
            <DialogDescription>
              Waiving: <strong>{selectedFee?.feeName}</strong> — Due: Rs.{selectedFee?.dueAmount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Waiver Amount (Rs.) — leave blank to waive full due</Label>
              <Input type="number" placeholder={`${selectedFee?.dueAmount} (full)`} value={waiverAmount} onChange={e => setWaiverAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea placeholder="e.g. Financial hardship, scholarship, director approval" value={waiverReason} onChange={e => setWaiverReason(e.target.value)} className="resize-none h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaiverDialog(false)}>Cancel</Button>
            <Button onClick={handleWaive} disabled={isWaiving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isWaiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Waiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}

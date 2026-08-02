"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { salaryService } from "@/features/finance/services/salaryService";
import { SalaryStructure, PaymentMethod } from "@/types/schema";

interface ProcessSalaryModalProps {
  madrassaId: string;
  userId: string;
  userName: string;
  month: number;
  year: number;
  onSuccess: () => void;
  disabled?: boolean;
}

export function ProcessSalaryModal({ madrassaId, userId, userName, month, year, onSuccess, disabled }: ProcessSalaryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<{ name: string; amount: number }[]>([]);
  const [deductions, setDeductions] = useState<{ name: string; amount: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadStructure();
    }
  }, [isOpen]);

  const loadStructure = async () => {
    setIsLoading(true);
    try {
      const struct = await salaryService.getSalaryStructure(userId);
      if (struct) {
        setBaseSalary(struct.baseSalary);
        setAllowances(struct.defaultAllowances || []);
        setDeductions(struct.defaultDeductions || []);
      } else {
        toast.warning(`No salary configured for ${userName}. Please configure it first.`);
        setIsOpen(false);
      }
    } catch (error) {
      toast.error("Failed to load salary structure");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async () => {
    if (baseSalary < 0) {
      toast.error("Base salary cannot be negative");
      return;
    }
    
    setIsProcessing(true);
    try {
      const netPaid = baseSalary + 
        allowances.reduce((s, a) => s + (a.amount || 0), 0) - 
        deductions.reduce((s, d) => s + (d.amount || 0), 0);

      await salaryService.processSalaryPayment(madrassaId, userId, month, year, {
        baseSalary,
        allowances,
        deductions,
        netPaid,
        paymentMethod,
        remarks
      });
      toast.success("Salary processed successfully");
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to process salary");
    } finally {
      setIsProcessing(false);
    }
  };

  const addAllowance = () => setAllowances([...allowances, { name: "", amount: 0 }]);
  const addDeduction = () => setDeductions([...deductions, { name: "", amount: 0 }]);

  const updateArray = (setter: any, arr: any[], index: number, field: string, value: any) => {
    const newArr = [...arr];
    newArr[index][field] = value;
    setter(newArr);
  };
  
  const removeArray = (setter: any, arr: any[], index: number) => {
    const newArr = [...arr];
    newArr.splice(index, 1);
    setter(newArr);
  };

  const netSalary = baseSalary + 
    allowances.reduce((s, a) => s + (Number(a.amount) || 0), 0) - 
    deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" disabled={disabled}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Pay Salary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Salary - {userName}</DialogTitle>
          <div className="text-sm text-muted-foreground">For the month of {monthName} {year}</div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Base Salary (Adjustable for this month)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  value={baseSalary || ""} 
                  onChange={e => setBaseSalary(Number(e.target.value))}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allowances (e.g. Overtime)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {allowances.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    placeholder="Name" 
                    value={item.name} 
                    onChange={e => updateArray(setAllowances, allowances, i, "name", e.target.value)}
                  />
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input 
                      type="number" 
                      placeholder="Amount" 
                      value={item.amount || ""} 
                      onChange={e => updateArray(setAllowances, allowances, i, "amount", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeArray(setAllowances, allowances, i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Deductions (e.g. Unpaid Leave)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {deductions.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    placeholder="Name" 
                    value={item.name} 
                    onChange={e => updateArray(setDeductions, deductions, i, "name", e.target.value)}
                  />
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input 
                      type="number" 
                      placeholder="Amount" 
                      value={item.amount || ""} 
                      onChange={e => updateArray(setDeductions, deductions, i, "amount", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeArray(setDeductions, deductions, i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional note..." />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg flex justify-between items-center mt-4">
              <span className="font-medium">Net Payable:</span>
              <span className="text-xl font-bold text-green-600">₹{netSalary.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleProcess} disabled={isProcessing}>
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

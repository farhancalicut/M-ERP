"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { salaryService } from "@/features/finance/services/salaryService";
import { SalaryStructure } from "@/types/schema";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ConfigureSalaryModalProps {
  madrassaId: string;
  userId: string;
  userName: string;
  asDropdownItem?: boolean;
  iconOnly?: boolean;
}

export function ConfigureSalaryModal({ madrassaId, userId, userName, asDropdownItem = false, iconOnly = false }: ConfigureSalaryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<{ name: string; amount: number }[]>([]);
  const [deductions, setDeductions] = useState<{ name: string; amount: number }[]>([]);

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
        setBaseSalary(0);
        setAllowances([]);
        setDeductions([]);
      }
    } catch (error) {
      toast.error("Failed to load salary structure");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (baseSalary < 0) {
      toast.error("Base salary cannot be negative");
      return;
    }
    
    setIsSaving(true);
    try {
      const netSalary = baseSalary + 
        allowances.reduce((s, a) => s + (a.amount || 0), 0) - 
        deductions.reduce((s, d) => s + (d.amount || 0), 0);

      await salaryService.updateSalaryStructure(madrassaId, userId, {
        baseSalary,
        defaultAllowances: allowances,
        defaultDeductions: deductions,
        netSalary
      });
      toast.success("Salary configuration saved");
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {asDropdownItem ? (
          <DropdownMenuItem onSelect={(e: any) => e.preventDefault()}>
            <IndianRupee className="w-4 h-4 mr-2" />
            Salary Config
          </DropdownMenuItem>
        ) : iconOnly ? (
          <Button variant="ghost" size="icon" title="Salary Config">
            <IndianRupee className="w-4 h-4 text-primary" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-600 transition-colors">
            Salary Config
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Salary - {userName}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Base Salary</Label>
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
                <Label>Allowances (e.g. HRA, Travel)</Label>
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
                <Label>Deductions (e.g. Tax, Provident Fund)</Label>
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

            <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
              <span className="font-medium">Total Net Salary:</span>
              <span className="text-xl font-bold text-green-600">₹{netSalary.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

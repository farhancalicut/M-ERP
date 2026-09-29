"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Download } from "lucide-react";
import { expenseService } from "../../services/expenseService";
import { Expense } from "@/types/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { exportUtils } from "@/lib/exportUtils";

export function ExpensesTab() {
  const { userData } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const loadExpenses = async () => {
    if (!userData?.madrassaId) return;
    try {
      setIsLoading(true);
      const data = await expenseService.getExpensesByMadrassa(userData.madrassaId);
      setExpenses(data);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [userData?.madrassaId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.madrassaId || !userData.uid) return;
    if (!amount || !description) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await expenseService.createExpense(
        userData.madrassaId,
        parseFloat(amount),
        description,
        userData.uid
      );
      toast.success("Expense recorded successfully");
      setAmount("");
      setDescription("");
      setIsAddOpen(false);
      loadExpenses();
    } catch (error) {
      toast.error("Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await expenseService.deleteExpense(id);
      toast.success("Expense deleted");
      loadExpenses();
    } catch (error) {
      toast.error("Failed to delete expense");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Madrassa Expenses</h2>
          <p className="text-sm text-muted-foreground">Track all outgoing payments and purchases.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            const data = expenses.map(e => ({ "Date": (e.date as any)?.toDate ? format((e.date as any).toDate(), "dd MMM yyyy") : "-", "Description": e.description, "Amount": e.amount, "Added By": (e as any).addedBy || (e as any).createdBy || "" }));
            await exportUtils.exportToCSV(data, "expenses");
            toast.success("Expenses exported");
          }} disabled={expenses.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="e.g. 500"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="e.g. Bought stationary for office"
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(expense.date.toDate(), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      -₹{expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id as string)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {expenses.length > 0 && (
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={2} className="text-sm">Total Expenses</TableCell>
                  <TableCell className="text-right text-destructive font-bold">
                    -₹{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

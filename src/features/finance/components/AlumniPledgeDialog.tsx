import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { pledgeService } from "@/features/finance/services/pledgeService";

export function AlumniPledgeDialog({ madrassaId, alumniId, onSuccess }: { madrassaId: string; alumniId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "UPI" | "OTHER">("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [purpose, setPurpose] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!transactionId) {
      toast.error("Please enter the transaction ID/reference number");
      return;
    }

    try {
      setLoading(true);
      await pledgeService.createPledge(
        madrassaId,
        alumniId,
        Number(amount),
        paymentMethod,
        transactionId,
        purpose
      );
      toast.success("Donation details submitted successfully! Awaiting verification.");
      onSuccess();
      setOpen(false);
      
      // Reset form
      setAmount("");
      setTransactionId("");
      setPurpose("");
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit donation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto font-semibold">
          <Send className="mr-2 h-4 w-4" /> Submit Donation Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Your Donation</DialogTitle>
          <DialogDescription>
            Have you already transferred the funds? Please enter the details below so we can verify and add it to our records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount Donated (₹)</Label>
            <Input 
              id="amount" 
              type="number" 
              min="1"
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="e.g. 5000"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Payment Method Used</Label>
            <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPI">UPI (Google Pay, PhonePe, etc.)</SelectItem>
                <SelectItem value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="txnId">Transaction ID / Reference Number</Label>
            <Input 
              id="txnId" 
              value={transactionId} 
              onChange={e => setTransactionId(e.target.value)} 
              placeholder="e.g. UTR/Txn Number"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purpose">Purpose / Message (Optional)</Label>
            <Textarea 
              id="purpose" 
              value={purpose} 
              onChange={e => setPurpose(e.target.value)} 
              placeholder="e.g. For library books"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Details
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

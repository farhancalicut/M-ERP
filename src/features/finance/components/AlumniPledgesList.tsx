import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { pledgeService } from "@/features/finance/services/pledgeService";
import { DonationPledge } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { alumniService } from "@/features/promotion/services/alumniService";

export function AlumniPledgesList() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [pledges, setPledges] = useState<(DonationPledge & { alumniName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!madrassaId) return;
    try {
      setLoading(true);
      const data = await pledgeService.getPendingPledges(madrassaId);
      
      // Fetch alumni names for each pledge
      const enhancedData = await Promise.all(data.map(async (pledge) => {
        try {
          const alumni = await alumniService.getAlumniProfile(pledge.alumniId);
          return { ...pledge, alumniName: alumni?.name || "Unknown Alumni" };
        } catch (e) {
          return { ...pledge, alumniName: "Unknown Alumni" };
        }
      }));
      
      setPledges(enhancedData);
    } catch (err: any) {
      console.error("Pledges Error:", err);
      toast.error(err?.message || "Failed to load pledges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [madrassaId]);

  const handleApprove = async (pledgeId: string) => {
    if (!madrassaId || !userData?.uid) return;
    try {
      setProcessingId(pledgeId);
      await pledgeService.approvePledge(pledgeId, madrassaId, userData.uid);
      toast.success("Donation approved and added to finance records.");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve pledge");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pledgeId: string) => {
    if (!userData?.uid) return;
    try {
      setProcessingId(pledgeId);
      await pledgeService.rejectPledge(pledgeId, userData.uid);
      toast.success("Donation pledge rejected.");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject pledge");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (pledges.length === 0) {
    return <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20 border-dashed">No pending donation pledges found.</div>;
  }

  return (
    <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Alumni</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment Info</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pledges.map((pledge) => (
              <tr key={pledge.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  {pledge.date?.toMillis ? format(pledge.date.toMillis(), 'MMM dd, yyyy') : '-'}
                </td>
                <td className="px-4 py-3 font-medium">
                  {pledge.alumniName}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  ₹{pledge.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{pledge.paymentMethod}</div>
                  <div className="text-xs text-muted-foreground">{pledge.transactionId}</div>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate">
                  {pledge.purpose || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleReject(pledge.id!)}
                      disabled={processingId !== null}
                    >
                      {processingId === pledge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />} Reject
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(pledge.id!)}
                      disabled={processingId !== null}
                    >
                      {processingId === pledge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />} Approve
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

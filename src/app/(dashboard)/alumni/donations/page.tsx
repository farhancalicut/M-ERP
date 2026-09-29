"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Clock, CheckCircle2, XCircle } from "lucide-react";
import { donationSettingsService } from "@/features/finance/services/donationSettingsService";
import { pledgeService } from "@/features/finance/services/pledgeService";
import { DonationSettings, DonationPledge } from "@/types/schema";
import { AlumniPledgeDialog } from "@/features/finance/components/AlumniPledgeDialog";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AlumniDonationsPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const alumniId = userData?.userId;

  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [pledges, setPledges] = useState<DonationPledge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!madrassaId || !alumniId) return;
    try {
      setLoading(true);
      const [settingsData, pledgesData] = await Promise.all([
        donationSettingsService.getSettings(madrassaId),
        pledgeService.getAlumniPledges(madrassaId, alumniId)
      ]);
      setSettings(settingsData);
      setPledges(pledgesData);
    } catch (err: any) {
      console.error("Donation Data Error:", err);
      toast.error(err?.message || "Failed to load donation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [madrassaId, alumniId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending Verification</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="py-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Your Alma Mater</h1>
          <p className="text-muted-foreground mt-1">Make a difference for the next generation of students.</p>
        </div>
      </div>

      {/* Motivating Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            {settings?.title || "Support Our Cause"}
          </CardTitle>
          <CardDescription className="text-base text-slate-700 dark:text-slate-300 pt-2 whitespace-pre-wrap">
            {settings?.description || "Your generous contributions help us maintain the institution and provide scholarships to deserving students. Every donation makes a huge impact."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-8 items-center pt-4">
          {settings?.qrCodeUrl && (
            <div className="shrink-0 bg-white p-3 rounded-xl shadow-sm border">
              <img src={settings.qrCodeUrl} alt="Payment QR Code" className="w-48 h-48 object-cover rounded-md" />
              <p className="text-center text-xs text-muted-foreground mt-2 font-medium">Scan to Pay</p>
            </div>
          )}
          <div className="space-y-4 flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-lg">How to donate?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Scan the QR code or use the provided bank details to make a transfer.</li>
              <li>Note down your Transaction ID or Reference Number.</li>
              <li>Click the button below to submit your donation details.</li>
              <li>Our management team will verify and add it to your records!</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="bg-primary/5 border-t py-4 sm:justify-end justify-center">
          <AlumniPledgeDialog madrassaId={madrassaId!} alumniId={alumniId!} onSuccess={loadData} />
        </CardFooter>
      </Card>

      {/* Past Pledges/Donations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Your Donation History</h2>
        
        {pledges.length === 0 ? (
          <div className="bg-muted/50 rounded-xl p-8 text-center border border-dashed">
            <Heart className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">You haven't submitted any donations yet.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method & Txn ID</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pledges.map((pledge) => (
                    <tr key={pledge.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pledge.date?.toMillis ? format(pledge.date.toMillis(), 'MMM dd, yyyy') : '-'}
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(pledge.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

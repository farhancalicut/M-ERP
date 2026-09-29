"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, MapPin, Phone, Mail, FileText, CreditCard, Clock, Activity, CalendarDays, ShieldAlert, Edit2 } from "lucide-react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa } from "@/types/schema";

type FilterStatus = "Active" | "Grace" | "Suspended";

const computeStatus = (madrassa: Madrassa): FilterStatus => {
  if (madrassa.status === "SUSPENDED") return "Suspended";
  if (madrassa.subscriptionExpiry) {
    const expiry = madrassa.subscriptionExpiry.toDate();
    const now = new Date();
    const diffDays = (now.getTime() - expiry.getTime()) / (1000 * 3600 * 24);
    
    if (diffDays > 0 && diffDays <= 7) return "Grace";
    if (diffDays > 7) return "Suspended"; 
  }
  return "Active";
};

export default function ViewMadrassaPage() {
  const { id } = useParams();
  const [madrassa, setMadrassa] = useState<Madrassa | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      madrassaService.getMadrassaById(id as string).then(data => {
        setMadrassa(data);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">Loading Madrassa Data...</p>
      </div>
    );
  }

  if (!madrassa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Building2 className="w-16 h-16 text-muted-foreground opacity-20" />
        <h2 className="text-2xl font-bold">Madrassa Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/super-admin/madrassas">Return to Directory</Link>
        </Button>
      </div>
    );
  }

  const status = computeStatus(madrassa);
  let statusColor = "bg-gray-100 text-gray-800 border-gray-200";
  if (status === "Active") statusColor = "bg-green-50 text-green-700 border-green-200";
  if (status === "Grace") statusColor = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200";
  if (status === "Suspended") statusColor = "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200";

  let daysRemaining = 0;
  let progressPercentage = 0;
  if (madrassa.subscriptionExpiry) {
    const expiryDate = madrassa.subscriptionExpiry.toDate();
    const createdDate = madrassa.createdAt?.toDate() || new Date();
    daysRemaining = differenceInDays(expiryDate, new Date());
    
    const totalDays = differenceInDays(expiryDate, createdDate) || 365;
    const daysPassed = totalDays - daysRemaining;
    progressPercentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/super-admin/madrassas">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{madrassa.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                {status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              ID: {madrassa.code}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/super-admin/subscriptions/${madrassa.id}`}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              Manage Subscription
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/super-admin/madrassas/${madrassa.id}/edit`}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Details
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Core Information
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" /> Board Assignment
                </p>
                <p className="font-medium pl-6">{madrassa.board ? madrassa.board.replace('_', ' ') : 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> Email Address
                </p>
                <p className="font-medium pl-6">{madrassa.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> Contact Number
                </p>
                <p className="font-medium pl-6">{madrassa.contactNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> Address
                </p>
                <p className="font-medium pl-6">
                  {madrassa.addressLine1}<br/>
                  {madrassa.city}, {madrassa.state} {madrassa.pincode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Summary */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Subscription Status
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold capitalize mt-1">{madrassa.subscriptionPlan.toLowerCase()}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" /> Expiry
                  </span>
                  <span className="font-medium">
                    {madrassa.subscriptionExpiry ? format(madrassa.subscriptionExpiry.toDate(), 'PPP') : 'N/A'}
                  </span>
                </div>
                
                {madrassa.subscriptionExpiry && (
                  <>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${daysRemaining < 7 ? 'bg-destructive' : 'bg-primary'}`} 
                        style={{ width: `${progressPercentage}%` }} 
                      />
                    </div>
                    <p className={`text-xs text-right font-medium ${daysRemaining < 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {daysRemaining > 0 
                        ? `${daysRemaining} days remaining` 
                        : daysRemaining === 0 
                          ? 'Expires today' 
                          : `Expired ${Math.abs(daysRemaining)} days ago`}
                    </p>
                  </>
                )}
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Onboarded On</span>
                  <span>{madrassa.createdAt ? format(madrassa.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Setup Status</span>
                  <span className="font-medium">{madrassa.isSetupComplete ? 'Completed' : 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

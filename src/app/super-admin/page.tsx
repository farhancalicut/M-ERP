"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, Clock, AlertTriangle, ShieldAlert, Activity, FileText } from "lucide-react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StatCard } from "@/components/dashboard/StatCard";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, AuditLog } from "@/types/schema";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState({ totalMadrassas: 0, active: 0, gracePeriod: 0, suspended: 0 });
  const [expiring, setExpiring] = useState<Madrassa[]>([]);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, expiringData, activityData] = await Promise.all([
          madrassaService.getPlatformStats(),
          madrassaService.getExpiringMadrassas(),
          madrassaService.getRecentActivity()
        ]);
        setStats(statsData);
        setExpiring(expiringData);
        setActivities(activityData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getActionTheme = (action: string): "teal" | "tan" | "mint" | "gray" | "red" => {
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD')) return 'mint';
    if (a.includes('DELETE') || a.includes('SUSPEND') || a.includes('REMOVE')) return 'red';
    if (a.includes('UPDATE') || a.includes('EDIT')) return 'tan';
    if (a.includes('FEE') || a.includes('PAYMENT')) return 'tan';
    return 'gray';
  };

  const getActionIcon = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE')) return FileText;
    if (a.includes('DELETE')) return ShieldAlert;
    if (a.includes('UPDATE')) return Activity;
    return FileText;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Welcome back, {userData?.displayName || 'Administrator'}
        </h1>
        <p className="text-muted-foreground mt-2 text-slate-500 dark:text-slate-400">
          Here is an overview of the platform's status for today, {format(new Date(), 'MMMM do, yyyy')}.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="TOTAL MADRASSAS"
          value={loading ? "..." : stats.totalMadrassas}
          icon={Building2}
          colorTheme="teal"
          trend={{ label: "Platform Total" }}
        />
        <StatCard
          title="ACTIVE TENANTS"
          value={loading ? "..." : stats.active}
          icon={CreditCard}
          colorTheme="tan"
          trend={{ label: "Stable", isPositive: true }}
        />
        <StatCard
          title="GRACE PERIOD"
          value={loading ? "..." : stats.gracePeriod}
          icon={Clock}
          colorTheme="mint"
          trend={{ label: "Read-only" }}
        />
        <StatCard
          title="SUSPENDED"
          value={loading ? "..." : stats.suspended}
          icon={ShieldAlert}
          colorTheme="red"
          trend={stats.suspended > 0 ? { label: "Action Needed", isPositive: false } : undefined}
        />
      </div>

      {/* Main Content Grid 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Alerts / Charts) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Expiring Subscriptions</h2>
              <Button variant="outline" size="sm" className="h-8">View All</Button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>)}
                </div>
              ) : expiring.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No subscriptions expiring soon.</p>
                </div>
              ) : (
                expiring.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-50 dark:bg-red-500/10 p-2.5 rounded-lg text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {m.subscriptionPlan} • Expires: {m.subscriptionExpiry ? format(m.subscriptionExpiry.toDate(), 'PP') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                      <Link href={`/super-admin/madrassas/${m.id}`}>
                        Renew
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-full max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Activity</h2>
              <Button variant="link" size="sm" className="text-primary font-semibold p-0 h-auto">View All</Button>
            </div>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No recent activity.</p>
                </div>
              ) : (
                activities.map((log) => {
                  const theme = getActionTheme(log.action);
                  const Icon = getActionIcon(log.action);
                  
                  const themeStyles = {
                    teal: "bg-primary/10 text-primary",
                    tan: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    mint: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    gray: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                    red: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
                  };

                  return (
                    <div key={log.id} className="flex gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", themeStyles[theme])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-100 leading-snug">
                          <span className="font-bold">{log.action}</span>: {log.userName} ({log.role}) on {log.module.toLowerCase()} for <span className="font-semibold">{log.madrassaId}</span>.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                          {format(log.createdAt.toDate(), 'PP p')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Building2, CreditCard, Clock, AlertTriangle, ShieldAlert, Activity,
  FileText, Users, GraduationCap, UserCheck, ChevronRight, Search,
  TrendingUp, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StatCard } from "@/components/dashboard/StatCard";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, AuditLog } from "@/types/schema";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:    { label: "Active",      color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30", icon: CheckCircle2 },
  SUSPENDED: { label: "Suspended",   color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30", icon: XCircle },
  GRACE:     { label: "Grace Period",color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30", icon: Clock },
  INACTIVE:  { label: "Inactive",    color: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600", icon: XCircle },
};

export default function SuperAdminDashboard() {
  const { userData } = useAuthStore();
  const [stats, setStats] = useState({ totalMadrassas: 0, active: 0, gracePeriod: 0, suspended: 0 });
  const [madrassas, setMadrassas] = useState<Madrassa[]>([]);
  const [filtered, setFiltered] = useState<Madrassa[]>([]);
  const [expiring, setExpiring] = useState<Madrassa[]>([]);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResult, madrassasResult, expiringResult, activityResult] = await Promise.allSettled([
          madrassaService.getPlatformStats(),
          madrassaService.getAllMadrassas(),
          madrassaService.getExpiringMadrassas(),
          madrassaService.getRecentActivity()
        ]);
        if (statsResult.status === 'fulfilled')     setStats(statsResult.value);
        if (madrassasResult.status === 'fulfilled') { setMadrassas(madrassasResult.value); setFiltered(madrassasResult.value); }
        if (expiringResult.status === 'fulfilled')  setExpiring(expiringResult.value);
        if (activityResult.status === 'fulfilled')  setActivities(activityResult.value);
        // Log any individual failures for debugging
        [statsResult, madrassasResult, expiringResult, activityResult].forEach((r, i) => {
          if (r.status === 'rejected') console.error(`Dashboard section ${i} failed:`, r.reason);
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(madrassas);
    } else {
      const q = search.toLowerCase();
      setFiltered(madrassas.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
      ));
    }
  }, [search, madrassas]);

  const totalStudents = madrassas.reduce((s, m) => s + (m.studentCount || 0), 0);
  const totalStaff = madrassas.reduce((s, m) => s + (m.staffCount || 0), 0);
  const totalParents = madrassas.reduce((s, m) => s + (m.parentCount || 0), 0);

  const getActionTheme = (action: string): "teal" | "tan" | "mint" | "gray" | "red" => {
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD')) return 'mint';
    if (a.includes('DELETE') || a.includes('SUSPEND') || a.includes('REMOVE')) return 'red';
    if (a.includes('UPDATE') || a.includes('EDIT')) return 'tan';
    return 'gray';
  };

  const getActionIcon = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE')) return FileText;
    if (a.includes('DELETE')) return ShieldAlert;
    if (a.includes('UPDATE')) return Activity;
    return FileText;
  };

  const getMadrassaStatus = (m: Madrassa): string => {
    if (m.status !== "ACTIVE") return m.status || "INACTIVE";
    if (m.subscriptionExpiry) {
      const expiry = m.subscriptionExpiry.toDate();
      const now = new Date();
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 7);
      if (expiry < now && expiry >= sevenDaysAgo) return "GRACE";
      if (expiry < now) return "SUSPENDED";
    }
    return "ACTIVE";
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1.5 text-slate-500 dark:text-slate-400">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{userData?.displayName || 'Administrator'}</span> — {format(new Date(), 'MMMM do, yyyy')}
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="gap-2 shrink-0">
          <Link href="/super-admin/madrassas/new">
            <Building2 className="h-4 w-4" /> Onboard Madrassa
          </Link>
        </Button>
      </div>

      {/* Madrassa Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="TOTAL MADRASSAS" value={loading ? "..." : stats.totalMadrassas} icon={Building2} colorTheme="teal" trend={{ label: "Platform Total" }} />
        <StatCard title="ACTIVE TENANTS"  value={loading ? "..." : stats.active}         icon={CreditCard}  colorTheme="tan"  trend={{ label: "Stable", isPositive: true }} />
        <StatCard title="GRACE PERIOD"    value={loading ? "..." : stats.gracePeriod}    icon={Clock}       colorTheme="mint" trend={{ label: "Read-only" }} />
        <StatCard title="SUSPENDED"       value={loading ? "..." : stats.suspended}      icon={ShieldAlert} colorTheme="red"  trend={stats.suspended > 0 ? { label: "Action Needed", isPositive: false } : undefined} />
      </div>

      {/* Platform-wide people stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Students", value: totalStudents, icon: GraduationCap, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Total Staff",    value: totalStaff,    icon: UserCheck,     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
          { label: "Total Parents",  value: totalParents,  icon: Users,         color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className={cn("p-3 rounded-xl shrink-0", bg)}>
              <Icon className={cn("h-6 w-6", color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loading ? "..." : value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Madrassa Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Madrassa Directory</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">All registered tenants with live usage stats</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search madrassas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Madrassa</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Students</span>
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-1"><UserCheck className="h-3.5 w-3.5" />Staff</span>
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" />Parents</span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subscription</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">{search ? "No madrassas match your search." : "No madrassas onboarded yet."}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const statusKey = getMadrassaStatus(m);
                  const cfg = (statusConfig[statusKey] || statusConfig.INACTIVE)!;
                  const StatusIcon = cfg.icon;
                  const expiry = m.subscriptionExpiry?.toDate();

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {m.logoUrl ? (
                            <img src={m.logoUrl} alt={m.name} className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-primary font-bold text-sm">{m.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{m.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.code} · {m.city || m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{(m.studentCount ?? 0).toLocaleString()}</span>
                          <span className="text-xs text-slate-400">students</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{(m.staffCount ?? 0).toLocaleString()}</span>
                          <span className="text-xs text-slate-400">staff</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{(m.parentCount ?? 0).toLocaleString()}</span>
                          <span className="text-xs text-slate-400">parents</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">{m.subscriptionPlan}</span>
                      </td>
                      <td className="px-4 py-4">
                        {expiry ? (
                          <div>
                            <p className={cn("text-sm font-medium", expiry < new Date() ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300")}>
                              {format(expiry, 'dd MMM yyyy')}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {expiry < new Date() ? "Expired " : ""}{formatDistanceToNow(expiry, { addSuffix: true })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/super-admin/madrassas/${m.id}`}>
                            Manage <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Expiring Subscriptions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Expiring Subscriptions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Expiring Soon</h2>
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <Link href="/super-admin/subscriptions">View All</Link>
              </Button>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />)}
                </div>
              ) : expiring.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No subscriptions expiring in the next 7 days.</p>
                </div>
              ) : (
                expiring.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{m.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {m.subscriptionPlan} · Expires {m.subscriptionExpiry ? format(m.subscriptionExpiry.toDate(), 'PP') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs shrink-0" asChild>
                      <Link href={`/super-admin/madrassas/${m.id}`}>Renew</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-full max-h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Activity</h2>
            </div>
            
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              {loading ? (
                <div className="animate-pulse space-y-5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No recent activity.</p>
                </div>
              ) : (
                activities.map((log) => {
                  const theme = getActionTheme(log.action);
                  const Icon = getActionIcon(log.action);
                  const themeStyles: Record<string, string> = {
                    teal: "bg-primary/10 text-primary",
                    tan: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    mint: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    gray: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                    red: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
                  };
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", themeStyles[theme])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="font-semibold">{log.action}</span> by {log.userName} ({log.role})
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : ''}
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

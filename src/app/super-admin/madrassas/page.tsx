"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Eye, Edit2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/table/DataTable";
import Link from "next/link";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa } from "@/types/schema";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

type FilterStatus = "All" | "Active" | "Grace" | "Suspended";

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

export default function MadrassasPage() {
  const [madrassas, setMadrassas] = useState<Madrassa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");

  useEffect(() => {
    const fetchMadrassas = async () => {
      try {
        const data = await madrassaService.getAllMadrassas();
        setMadrassas(data);
      } catch (error) {
        console.error("Failed to fetch madrassas", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMadrassas();
  }, []);

  const filteredMadrassas = useMemo(() => {
    return madrassas.filter(m => {
      const computed = computeStatus(m);
      const matchesFilter = filter === "All" || computed === filter;
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [madrassas, filter, searchQuery]);

  const columns: ColumnDef<Madrassa>[] = [
    {
      accessorKey: "name",
      header: "Madrassa Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "subscriptionPlan",
      header: "Subscription Plan",
      cell: ({ row }) => <span className="text-sm capitalize">{row.original.subscriptionPlan.toLowerCase()}</span>,
    },
    {
      accessorKey: "subscriptionExpiry",
      header: "Expiry Date",
      cell: ({ row }) => {
        const date = row.original.subscriptionExpiry?.toDate();
        return date ? <span className="text-sm">{format(date, 'PP')}</span> : <span className="text-sm text-muted-foreground">N/A</span>;
      }
    },
    {
      id: "statusBadge",
      header: "Status",
      cell: ({ row }) => {
        const status = computeStatus(row.original);
        let colorClass = "bg-gray-100 text-gray-800";

        if (status === "Active") colorClass = "bg-green-100 text-green-800";
        else if (status === "Grace") colorClass = "bg-amber-100 text-amber-800";
        else if (status === "Suspended") colorClass = "bg-red-100 text-red-800";

        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const madrassa = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/super-admin/madrassas/${madrassa.id}`} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/super-admin/subscriptions/${madrassa.id}`} className="cursor-pointer">
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Edit Subscription
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/super-admin/madrassas/${madrassa.id}/edit`} className="cursor-pointer">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Madrassas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage onboarded institutions.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" asChild>
          <Link href="/super-admin/madrassas/new">
            <Plus className="w-4 h-4 mr-2" />
            Onboard New Madrassa
          </Link>
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            {(["All", "Active", "Grace", "Suspended"] as FilterStatus[]).map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
                className={`rounded-full transition-colors ${filter === f ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary rounded-lg"
            />
          </div>
        </div>
        <div className="p-0">
          <DataTable
            columns={columns}
            data={filteredMadrassas}
            searchKey="name"
          />
        </div>
      </div>
    </div>
  );
}

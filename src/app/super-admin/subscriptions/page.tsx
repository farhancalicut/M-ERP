"use client";

import { useEffect, useState } from "react";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Settings2, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { EditSubscriptionDialog } from "@/features/super-admin/components/EditSubscriptionDialog";

export default function SubscriptionsPage() {
  const [madrassas, setMadrassas] = useState<Madrassa[]>([]);
  const [filteredMadrassas, setFilteredMadrassas] = useState<Madrassa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingMadrassa, setEditingMadrassa] = useState<Madrassa | null>(null);

  useEffect(() => {
    async function loadMadrassas() {
      try {
        const data = await madrassaService.getAllMadrassas();
        setMadrassas(data);
        setFilteredMadrassas(data);
      } catch (error) {
        console.error("Failed to load madrassas", error);
      } finally {
        setLoading(false);
      }
    }
    loadMadrassas();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMadrassas(madrassas);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMadrassas(
        madrassas.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.code.toLowerCase().includes(query) ||
            (m.email && m.email.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, madrassas]);

  const handleSubscriptionUpdate = (updatedMadrassa: Madrassa) => {
    setMadrassas((prev) =>
      prev.map((m) => (m.id === updatedMadrassa.id ? updatedMadrassa : m))
    );
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform subscription plans and access for madrassas.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search madrassas..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Madrassa Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMadrassas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No madrassas found.
                  </td>
                </tr>
              ) : (
                filteredMadrassas.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{m.code}</td>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium text-xs border border-blue-200">
                        {m.subscriptionPlan || "Basic"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {m.subscriptionStatus === "ACTIVE" ? (
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                        ) : m.subscriptionStatus === "EXPIRED" ? (
                          <ShieldAlert className="w-4 h-4 text-orange-600" />
                        ) : (
                          <ShieldX className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-xs font-medium ${
                          m.subscriptionStatus === "ACTIVE" ? "text-green-700" :
                          m.subscriptionStatus === "EXPIRED" ? "text-orange-700" : "text-red-700"
                        }`}>
                          {m.subscriptionStatus || "ACTIVE"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMadrassa(m)}
                        className="h-8 gap-1"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditSubscriptionDialog
        madrassa={editingMadrassa}
        isOpen={!!editingMadrassa}
        onClose={() => setEditingMadrassa(null)}
        onSuccess={handleSubscriptionUpdate}
      />
    </div>
  );
}

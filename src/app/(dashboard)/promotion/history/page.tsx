"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { promotionService } from "@/features/promotion/services/promotionService";
import { Promotion } from "@/types/schema";
import { PromotionHistoryTable } from "@/features/promotion/components/PromotionHistoryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PromotionHistoryPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const loadData = async () => {
    if (!madrassaId) return;
    try {
      setLoading(true);
      const res = await promotionService.getPromotionHistory(madrassaId, undefined, 100);
      setPromotions(res.promotions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [madrassaId]);

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotion History</h1>
          <p className="text-muted-foreground">View and manage past promotion operations.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
             <PromotionHistoryTable data={promotions} onRefresh={loadData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

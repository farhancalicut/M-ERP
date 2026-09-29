"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Undo2, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { promotionService } from "../services/promotionService";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Promotion } from "@/types/schema";
import { classService } from "@/features/academic/services/classService";
import { academicYearService } from "@/features/academic/services/academicYearService";

interface PromotionHistoryTableProps {
  data: Promotion[];
  onRefresh: () => void;
}

export function PromotionHistoryTable({ data, onRefresh }: PromotionHistoryTableProps) {
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [yearMap, setYearMap] = useState<Record<string, string>>({});
  const { userData } = useAuthStore();

  // Resolve IDs to names once data is loaded
  useEffect(() => {
    if (!userData?.madrassaId || data.length === 0) return;

    const loadMaps = async () => {
      try {
        const [classRes, yearRes] = await Promise.all([
          classService.getClasses(userData.madrassaId, "ALL", undefined, 200),
          academicYearService.getAcademicYears(userData.madrassaId, "ALL", undefined, 50)
        ]);
        const cMap: Record<string, string> = {};
        classRes.classes.forEach(c => { cMap[c.id as string] = c.name; });
        setClassMap(cMap);

        const yMap: Record<string, string> = {};
        yearRes.years.forEach(y => { yMap[y.id!] = y.name; });
        setYearMap(yMap);
      } catch {}
    };
    loadMaps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, data.length]);

  const handleRollback = async (promotionId: string) => {
    if (!confirm("Are you sure you want to rollback this promotion? This will revert all student records.")) return;
    try {
      setRollingBackId(promotionId);
      await promotionService.validateRollbackAllowed(promotionId);
      await promotionService.rollbackPromotion(promotionId, userData?.uid || "");
      toast.success("The promotion has been successfully reverted.");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rollback Failed");
    } finally {
      setRollingBackId(null);
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No promotion records found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(promotion => {
        const isExpanded = expandedId === promotion.id;
        const fromName = classMap[promotion.fromClassId] || promotion.fromClassId;
        const toName = promotion.toClassId ? (classMap[promotion.toClassId] || promotion.toClassId) : "—";
        const yearName = yearMap[promotion.academicYearId] || promotion.academicYearId;
        const date = (promotion.createdAt as any)?.toDate ? format((promotion.createdAt as any).toDate(), "dd MMM yyyy, hh:mm a") : "—";

        return (
          <div key={promotion.id} className="border rounded-lg bg-card overflow-hidden">
            {/* Main row */}
            <div className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Academic Year</p>
                  <p className="text-sm font-semibold">{yearName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="text-sm font-semibold">{fromName} → {toName}</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Promoted</p>
                    <p className="text-lg font-bold text-green-600">{promotion.promotedCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Detained</p>
                    <p className="text-lg font-bold text-amber-600">{promotion.detainedCount ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Alumni</p>
                    <p className="text-lg font-bold text-blue-600">{promotion.alumniCount}</p>
                  </div>
                </div>
                <Badge variant={promotion.status === "COMPLETED" ? "default" : "destructive"}>
                  {promotion.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setExpandedId(isExpanded ? null : promotion.id!)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
                {promotion.status !== "ROLLED_BACK" && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleRollback(promotion.id!)}
                    disabled={rollingBackId === promotion.id}
                  >
                    {rollingBackId === promotion.id
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <Undo2 className="h-4 w-4 mr-1" />}
                    Rollback
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded student list */}
            {isExpanded && (
              <div className="border-t bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Student Breakdown</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {promotion.students.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded text-sm border ${
                      s.action === "PROMOTED" ? "bg-green-50 border-green-200 dark:bg-green-900/10" :
                      s.action === "ALUMNI" ? "bg-blue-50 border-blue-200 dark:bg-blue-900/10" :
                      "bg-amber-50 border-amber-200 dark:bg-amber-900/10"
                    }`}>
                      <span className="font-medium truncate">{s.studentName}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                        {s.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
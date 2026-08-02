"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PromotionStudent } from "@/types/schema";
import { promotionService } from "../services/promotionService";
import { CheckCircle, XCircle, GraduationCap } from "lucide-react";

interface PromotionSummaryCardProps {
  students: PromotionStudent[];
}

export function PromotionSummaryCard({ students }: PromotionSummaryCardProps) {
  const summary = promotionService.calculatePromotionSummary(students);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
            <h3 className="text-2xl font-bold">{summary.totalStudents}</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Promoted</p>
            <h3 className="text-2xl font-bold text-green-600">{summary.promotedCount}</h3>
          </div>
          <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Detained</p>
            <h3 className="text-2xl font-bold text-red-600">{summary.detainedCount}</h3>
          </div>
          <XCircle className="h-8 w-8 text-red-600 opacity-20" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">To Alumni</p>
            <h3 className="text-2xl font-bold text-blue-600">{summary.alumniCount}</h3>
          </div>
          <GraduationCap className="h-8 w-8 text-blue-600 opacity-20" />
        </CardContent>
      </Card>
    </div>
  );
}

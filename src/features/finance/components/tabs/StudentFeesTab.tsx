"use client";

import { useEffect, useState } from "react";
import { classService } from "@/features/academic/services/classService";
import { StudentFeeSearchClient } from "@/features/fees/components/StudentFeeSearchClient";
import { useAuthStore } from "@/stores/authStore";
import { Class } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";

export function StudentFeesTab() {
  const { userData } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId) {
      classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100).then(res => {
        let filteredClasses = res.classes;
        if (userData.role === 'TEACHER') {
          // If the user has assigned classes, filter by those. Otherwise, they see nothing.
          const assignedIds = userData.assignedClassIds || [];
          filteredClasses = filteredClasses.filter(c => assignedIds.includes(c.id as string));
        }
        setClasses(filteredClasses);
        setLoading(false);
      });
    }
  }, [userData?.madrassaId, userData?.role, userData?.assignedClassIds]);

  if (loading) return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading classes...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
      <StudentFeeSearchClient classes={classes} />
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { alumniService } from "@/features/promotion/services/alumniService";
import { Alumni } from "@/types/schema";
import { AlumniProfile } from "@/features/promotion/components/AlumniProfile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<Alumni | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await alumniService.getAlumniProfile(params.id as string);
        if (!res) throw new Error("Alumni not found");
        setAlumni(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load alumni");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
       loadData();
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!alumni) {
    return <div className="p-8 text-center text-muted-foreground">Alumni record not found.</div>;
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{alumni.name}</h1>
          <p className="text-muted-foreground">Alumni Profile Detail</p>
        </div>
      </div>

      <AlumniProfile alumni={alumni} />
    </div>
  );
}

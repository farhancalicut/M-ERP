"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { alumniService } from "@/features/promotion/services/alumniService";
import { Alumni } from "@/types/schema";
import { AlumniTable } from "@/features/promotion/components/AlumniTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GraduationCap, Award, BookOpen, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";
import { DonationSettingsDialog } from "@/features/finance/components/DonationSettingsDialog";
import { AlumniPledgesList } from "@/features/finance/components/AlumniPledgesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AlumniDirectoryPage() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const isAlumni = userData?.role === "ALUMNI";
  
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<Alumni[]>([]);

  const loadData = async () => {
    if (!madrassaId) return;
    try {
      setLoading(true);
      if (!isAlumni) {
        const res = await alumniService.getAlumniList(madrassaId, undefined, 100);
        setAlumni(res.alumni);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load alumni");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [madrassaId, isAlumni]);

  if (isAlumni) {
    return (
      <div className="py-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alumni Portal</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {userData?.displayName || "Alumni"}!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Graduation Year</CardTitle>
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Class of 2023</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Award className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="flex flex-col gap-6">
            {madrassaId && <NoticeBoardWidget madrassaId={madrassaId} role="ALUMNI" />}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Need a transcript or a certificate? You can request official documents directly from the administration.
              </p>
              <Button>Request Document</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alumni Directory</h1>
          <p className="text-muted-foreground">Manage graduated students and their accounts.</p>
        </div>
        <DonationSettingsDialog />
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="directory">Registered Alumni</TabsTrigger>
          <TabsTrigger value="pledges">Donation Pledges</TabsTrigger>
        </TabsList>
        
        <TabsContent value="directory">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                 <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                 <AlumniTable data={alumni} onRefresh={loadData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pledges">
          <Card>
            <CardContent className="pt-6">
              <AlumniPledgesList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

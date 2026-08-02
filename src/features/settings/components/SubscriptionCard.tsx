"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, ShieldAlert } from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";
import { useAuthStore } from "@/stores/authStore";
import { db } from "@/lib/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";

export function SubscriptionCard() {
  const { userData, setUserData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [madrassaStatus, setMadrassaStatus] = useState<string>("ACTIVE");
  const [plan, setPlan] = useState<string>("FREE");

  useEffect(() => {
    async function loadData() {
      if (userData?.madrassaId) {
        try {
          const docRef = doc(db, "madrassas", userData.madrassaId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setMadrassaStatus(data.subscriptionStatus || "ACTIVE");
            setPlan(data.subscriptionPlan || "FREE");
          }
        } catch (error) {
          toast.error("Failed to load subscription info");
        } finally {
          setInitialLoading(false);
        }
      }
    }
    loadData();
  }, [userData?.madrassaId]);

  const handleLockToggle = async () => {
    if (!userData?.madrassaId || !userData?.id) return;

    // Optional: Double check if user is Management. UI also restricts this.
    if (userData.role !== 'MANAGEMENT' && userData.role !== 'SUPER_ADMIN') {
      toast.error("Permission denied");
      return;
    }

    setLoading(true);
    try {
      if (madrassaStatus === "LOCKED") {
        await subscriptionService.unlockMadrassa(userData.madrassaId, userData.id);
        setMadrassaStatus("ACTIVE");
        toast.success("Madrassa unlocked successfully.");
        // Reflect in current session
        if (setUserData) {
          setUserData({ ...userData, subscriptionStatus: "ACTIVE" });
        }
      } else {
        await subscriptionService.lockMadrassa(userData.madrassaId, userData.id);
        setMadrassaStatus("LOCKED");
        toast.success("Madrassa locked successfully.");
        // Reflect in current session
        if (setUserData) {
          setUserData({ ...userData, subscriptionStatus: "LOCKED" });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update lock status");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card className={madrassaStatus === 'LOCKED' ? "border-red-500" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Overview</CardTitle>
            <CardDescription>Manage your current plan and system access.</CardDescription>
          </div>
          {madrassaStatus === "LOCKED" && (
            <div className="flex items-center text-red-600 bg-red-100 px-3 py-1 rounded-full text-sm font-semibold">
              <ShieldAlert className="w-4 h-4 mr-2" />
              SYSTEM LOCKED
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
            <p className="text-2xl font-bold mt-1 uppercase">{plan}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">System Status</p>
            <p className={`text-2xl font-bold mt-1 ${madrassaStatus === 'LOCKED' ? 'text-red-600' : 'text-green-600'}`}>
              {madrassaStatus}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Locking the madrassa will restrict all users (Teachers, Parents, Students) from accessing the system except for their profile and this settings page. 
            Use this if subscription payments are delayed or for administrative lockouts.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant={madrassaStatus === "LOCKED" ? "default" : "destructive"} 
          onClick={handleLockToggle}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {madrassaStatus === "LOCKED" ? (
            <><Unlock className="mr-2 h-4 w-4" /> Unlock System</>
          ) : (
            <><Lock className="mr-2 h-4 w-4" /> Lock System</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

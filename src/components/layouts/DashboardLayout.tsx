"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { differenceInDays } from "date-fns";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { ProfileModal } from "@/features/settings/components/ProfileModal";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userData, madrassa } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isLocked = userData?.subscriptionStatus === "LOCKED";
  const isAllowedWhenLocked = pathname?.startsWith("/principal/profile") || pathname?.startsWith("/settings/subscription");

  // Determine Grace Period / Warnings
  let daysRemaining = null;
  let isGracePeriod = false;
  if (madrassa?.subscriptionExpiry) {
    daysRemaining = differenceInDays(madrassa.subscriptionExpiry.toDate(), new Date());
    isGracePeriod = daysRemaining < 0 && daysRemaining >= -7;
  }

  // Check student limit
  const [studentLimitWarning, setStudentLimitWarning] = useState<string | null>(null);

  useEffect(() => {
    async function checkPlan() {
      if (madrassa?.subscriptionPlan && madrassa.studentCount !== undefined) {
        try {
          const planRef = doc(db, "subscriptionPlans", madrassa.subscriptionPlan);
          const planSnap = await getDoc(planRef);
          if (planSnap.exists()) {
            const plan = planSnap.data();
            if (plan.studentLimit !== 'Unlimited') {
              const limit = plan.studentLimit as number;
              const current = madrassa.studentCount;
              if (current >= limit) {
                setStudentLimitWarning(`Student limit reached (${current}/${limit}). No new students can be added.`);
              } else if (current >= limit * 0.9) {
                setStudentLimitWarning(`Approaching student limit (${current}/${limit}). Consider upgrading your plan.`);
              }
            }
          }
        } catch (e) {
          console.error("Failed to check plan limit", e);
        }
      }
    }
    checkPlan();
  }, [madrassa?.subscriptionPlan, madrassa?.studentCount]);

  return (
    <div className="fixed inset-0 flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-none bg-white dark:bg-slate-900">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        {/* Subscription Banners */}
        {!isLocked && madrassa && daysRemaining !== null && (
          <>
            {isGracePeriod && (
              <div className="bg-orange-500 text-white px-4 py-3 text-center text-sm font-medium">
                <ShieldAlert className="inline-block w-4 h-4 mr-2 mb-0.5" />
                Your subscription expired {Math.abs(daysRemaining)} days ago. You are in a 7-day grace period. System is in <strong>Read-Only Mode</strong>. Please contact Super Admin to renew immediately.
              </div>
            )}
            {!isGracePeriod && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 14 && (
              <div className="bg-amber-500 text-white px-4 py-3 text-center text-sm font-medium">
                <ShieldAlert className="inline-block w-4 h-4 mr-2 mb-0.5" />
                Your subscription expires in {daysRemaining} days. Please renew soon to avoid service interruption.
              </div>
            )}
            {studentLimitWarning && !isGracePeriod && (
              <div className="bg-yellow-500 text-white px-4 py-3 text-center text-sm font-medium">
                <ShieldAlert className="inline-block w-4 h-4 mr-2 mb-0.5" />
                {studentLimitWarning}
              </div>
            )}
          </>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {isLocked && !isAllowedWhenLocked ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-red-500" />
              <h2 className="text-2xl font-bold text-red-600">System Access Locked</h2>
              <p className="text-muted-foreground">
                Your institution's subscription is currently locked. You can only access your profile and subscription settings.
              </p>
              <div className="flex space-x-4 pt-4">
                {userData?.role === "PRINCIPAL" ? (
                  <Button asChild variant="outline">
                    <Link href="/principal/profile">My Profile</Link>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setIsProfileModalOpen(true)}>
                    My Profile
                  </Button>
                )}
                {['MANAGEMENT', 'SUPER_ADMIN'].includes(userData?.role || "") && (
                  <Button asChild>
                    <Link href="/settings/subscription">Manage Subscription</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <ProfileModal open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
    </div>
  );
}

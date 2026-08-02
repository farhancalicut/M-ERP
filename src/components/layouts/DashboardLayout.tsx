"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userData } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();

  const isLocked = userData?.subscriptionStatus === "LOCKED";
  const isAllowedWhenLocked = pathname?.startsWith("/settings/profile") || pathname?.startsWith("/settings/subscription");

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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {isLocked && !isAllowedWhenLocked ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-red-500" />
              <h2 className="text-2xl font-bold text-red-600">System Access Locked</h2>
              <p className="text-muted-foreground">
                Your institution's subscription is currently locked. You can only access your profile and subscription settings.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button asChild variant="outline">
                  <Link href="/settings/profile">My Profile</Link>
                </Button>
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
    </div>
  );
}

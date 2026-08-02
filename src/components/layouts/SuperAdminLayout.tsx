"use client";

import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { Header } from "./Header";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { userData } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <SuperAdminSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-none bg-white dark:bg-slate-900">
          <SuperAdminSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

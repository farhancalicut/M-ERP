"use client";

import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

export function MobileDrawer() {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { madrassa } = useAuthStore();

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => setSidebarOpen(false)}
      ></div>
      
      {/* Drawer Content */}
      <aside className="relative w-64 max-w-sm h-full bg-card shadow-xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center space-x-3">
          {madrassa?.logoUrl ? (
            <img src={madrassa.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded flex shrink-0 items-center justify-center text-primary-foreground font-bold">M</div>
          )}
          <h2 className="text-lg font-bold text-primary truncate" title={madrassa?.name || "M-ERP"}>
            {madrassa?.name || "M-ERP"}
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">Navigation placeholder</p>
        </nav>
      </aside>
    </div>
  );
}

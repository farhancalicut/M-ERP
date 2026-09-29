"use client";

import { Menu, Search } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { NotificationDropdown } from "@/features/notifications/components/NotificationDropdown";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header() {
  const { toggleSidebar } = useUIStore();
  const { madrassa } = useAuthStore();

  return (
    <header className="h-[72px] border-b border-border dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center flex-1 gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center gap-3 ml-4">
          {madrassa?.logoUrl ? (
            <img src={madrassa.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm " />
          ) : (
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg font-bold text-primary">
                {madrassa?.name ? madrassa.name.charAt(0).toUpperCase() : "M"}
              </span>
            </div>
          )}
          <span className="font-semibold text-lg tracking-tight text-slate-800 dark:text-slate-100 truncate max-w-[300px]" title={madrassa?.name || "Madrassa Dashboard"}>
            {madrassa?.name || "Madrassa Dashboard"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <NotificationDropdown />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { navigationConfig } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { userData, madrassa, isInitialized } = useAuthStore();

  if (!isInitialized || !userData) {
    return (
      <aside className="w-64 border-r border-border h-full bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-6">
          <div className="animate-pulse bg-muted h-8 w-32 rounded"></div>
        </div>
      </aside>
    );
  }

  const role = userData.role;
  const navItems = navigationConfig[role] || [];

  return (
    <aside className="w-64 border-r border-border h-full bg-white dark:bg-slate-900 flex flex-col shrink-0">
      <Link href={navItems[0]?.href || "/"} className="flex items-center gap-3 px-6 py-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-xl font-bold text-primary-foreground">M</span>
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100 truncate">
          M-ERP
        </span>
      </Link>
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== navItems[0]?.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                {
                  "bg-primary text-primary-foreground shadow-sm": isActive,
                  "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900": !isActive,
                }
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-slate-500 dark:text-slate-400")} />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 mb-2">
        <div className="border-t border-slate-100 dark:border-slate-800/50 my-2 pt-2"></div>
        <div className="px-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userData.email}</p>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 mt-0.5">{role}</div>
        </div>
      </div>
    </aside>
  );
}

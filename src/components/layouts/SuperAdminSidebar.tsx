"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { Home, Building2, FileText, Settings, BookOpen, ChevronUp, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { title: "Dashboard", href: "/super-admin", icon: Home },
  { title: "Madrassas", href: "/super-admin/madrassas", icon: Building2 },
  { title: "Question papers", href: "/super-admin/question-papers", icon: FileText },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, isInitialized } = useAuthStore();

  if (!isInitialized || !userData) {
    return (
      <aside className="w-64 border-r border-border h-full bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-6">
          <div className="animate-pulse bg-muted h-8 w-32 rounded"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-border h-full bg-white dark:bg-slate-900 flex flex-col shrink-0">
      <Link href="/super-admin" className="flex items-center gap-3 px-6 py-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
          <BookOpen className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="font-bold text-2xl tracking-tight text-slate-800 dark:text-slate-100">M-ERP</span>
      </Link>
      
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== '/super-admin');
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
      
      <div className="px-4 py-4 mb-2 mt-auto">
        <Link
          href="/super-admin/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-4",
            pathname.startsWith("/super-admin/settings")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900"
          )}
        >
          <Settings className={cn("h-4 w-4", pathname.startsWith("/super-admin/settings") ? "text-primary-foreground" : "text-slate-500 dark:text-slate-400")} />
          Settings
        </Link>
        <div className="border-t border-slate-100 dark:border-slate-800/50 my-2 pt-2"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left outline-none">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 truncate">
                  {userData.displayName || "Super Admin"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {userData.email}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" align="start" side="top">
            <DropdownMenuItem 
              onClick={async () => {
                try {
                  const { authService } = await import("@/features/auth/services/authService");
                  await authService.logout();
                  router.push("/login");
                } catch (error) {
                  console.error("Logout failed", error);
                }
              }} 
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

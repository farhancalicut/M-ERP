"use client";

import { LogOut, User, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/authService";
import { useAuthStore } from "@/stores/authStore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export function UserNav() {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";
  };

  if (!userData) return null;

  const roleLabels: Record<string, string> = {
    'SUPER_ADMIN': 'System Administrator',
    'MANAGEMENT': 'Management',
    'PRINCIPAL': 'Principal Office',
    'TEACHER': 'Teacher',
    'PARENT': 'Parent',
    'ALUMNI': 'Alumni'
  };

  const roleText = roleLabels[userData.role] || userData.role;
  const nameText = userData.displayName || "Admin User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors outline-none">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-sm font-semibold text-primary leading-none">{nameText}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{roleText}</span>
          </div>
          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
            <AvatarImage src="" alt={nameText} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {getInitials(nameText)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings/profile")} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {userData.role !== 'SUPER_ADMIN' && (
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

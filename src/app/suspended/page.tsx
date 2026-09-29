"use client";

import { useAuthStore } from "@/stores/authStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { ShieldOff, LogOut, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuspendedPage() {
  const { clearUser, madrassa } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    clearUser();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Account Suspended
          </h1>
          {madrassa?.name && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {madrassa.name}
            </p>
          )}
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Your institution&apos;s account has been suspended. Access to all features is temporarily unavailable.
            Please contact the platform administrator to resolve this issue.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Contact Support
          </p>
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span>support@m-erp.com</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>+91 00000 00000</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

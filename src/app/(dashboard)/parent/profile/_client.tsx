"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Shield, Lock, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ParentProfileClient() {
  const { userData } = useAuthStore();
  const router = useRouter();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (!userData) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    // Note: In a real app we'd call an authService.updatePassword(current, new) here.
    toast.error("Password update via this interface is coming soon.");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-white px-4 py-6 shadow-lg overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/20 overflow-hidden text-2xl font-bold">
            {userData.displayName ? userData.displayName.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight capitalize leading-tight truncate">
              {userData.displayName || "Parent User"}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 flex items-center gap-1">
                <Shield className="h-3 w-3" /> {userData.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Account Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              <User className="h-3 w-3" /> Full Name
            </p>
            <p className="text-sm font-semibold truncate px-3 py-2 bg-muted/30 rounded-lg border">
              {userData.displayName || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email Address
            </p>
            <p className="text-sm font-semibold truncate px-3 py-2 bg-muted/30 rounded-lg border">
              {userData.email || "N/A"}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">
          To update your name or email, please contact the school administration.
        </p>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border bg-card shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Security</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs font-semibold text-primary"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
          >
            {isChangingPassword ? "Cancel" : "Change Password"}
          </Button>
        </div>
        
        {isChangingPassword ? (
          <form onSubmit={handlePasswordChange} className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Current Password</label>
              <Input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-9 text-sm bg-muted/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">New Password</label>
              <Input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-9 text-sm bg-muted/20"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto mt-2 h-9 text-xs flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" /> Save New Password
            </Button>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-2 bg-muted/30 p-3 rounded-lg border border-dashed">
            <Lock className="h-4 w-4 opacity-50" />
            Your account is secured with a password.
          </div>
        )}
      </div>
    </div>
  );
}

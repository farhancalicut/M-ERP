"use client";

import { ShieldAlert } from "lucide-react";

export function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldAlert className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium tracking-tight">Access Denied</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          You do not have the required permissions to view this content or perform this action.
        </p>
      </div>
    </div>
  );
}

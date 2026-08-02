"use client";

import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  
  return (
    <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

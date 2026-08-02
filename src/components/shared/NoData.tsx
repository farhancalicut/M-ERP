"use client";

import { SearchX } from "lucide-react";

export function NoData({ message = "No data found." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
      <SearchX className="w-8 h-8 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

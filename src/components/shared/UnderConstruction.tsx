"use client";

import { Hammer } from "lucide-react";

export function UnderConstruction({ featureName }: { featureName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Hammer className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium tracking-tight">Under Construction</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {featureName ? `${featureName} is currently under development.` : "This feature is currently under development."} Check back later!
        </p>
      </div>
    </div>
  );
}

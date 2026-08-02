"use client";

import { FileX2 } from "lucide-react";
import { Button } from "../ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 border rounded-lg border-dashed bg-muted/20">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        {icon || <FileX2 className="w-6 h-6 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

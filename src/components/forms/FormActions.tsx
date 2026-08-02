import { ReactNode } from "react";

export function FormActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-x-4 pt-6 mt-6 border-t ${className}`}>
      {children}
    </div>
  );
}

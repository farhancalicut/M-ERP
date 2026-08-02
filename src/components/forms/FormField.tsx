import { ReactNode } from "react";
import { Label } from "../ui/label";

interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-baseline">
        <Label htmlFor={id} className={error ? "text-destructive" : ""}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      </div>
      {children}
      {description && !error && (
        <p className="text-[0.8rem] text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}

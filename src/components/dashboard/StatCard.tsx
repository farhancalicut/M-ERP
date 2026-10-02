import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value?: number;
    isPositive?: boolean;
    label?: string;
  } | undefined;
  colorTheme?: "teal" | "tan" | "mint" | "gray" | "red";
}

export function StatCard({ title, value, description, icon: Icon, trend, colorTheme = "teal" }: StatCardProps) {
  
  const themeStyles = {
    teal: "bg-primary/10 text-primary",
    tan: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    mint: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    gray: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    red: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className={cn("p-2.5 sm:p-3 rounded-xl flex items-center justify-center shrink-0", themeStyles[colorTheme])}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          {trend && (
            <div className={cn(
              "text-[11px] sm:text-xs font-semibold flex items-center",
              trend.isPositive === true ? "text-primary" :
              trend.isPositive === false ? "text-red-500" : "text-slate-600 dark:text-slate-300"
            )}>
              {trend.label || (
                <>
                  {trend.isPositive ? "↗ " : trend.isPositive === false ? "↘ " : ""}
                  {trend.value}%
                </>
              )}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 truncate" title={String(value)}>{value}</div>
          {description && (
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

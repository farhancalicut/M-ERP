import { EmptyState } from "../shared/EmptyState";
import { LayoutDashboard } from "lucide-react";

export function EmptyDashboard() {
  return (
    <EmptyState
      icon={<LayoutDashboard className="w-8 h-8 text-muted-foreground" />}
      title="No Dashboard Configured"
      description="Your dashboard has not been configured yet. Please contact your administrator."
    />
  );
}

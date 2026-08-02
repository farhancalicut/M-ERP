import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Action {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface QuickActionCardProps {
  title?: string;
  actions: Action[];
}

export function QuickActionCard({ title = "Quick Actions", actions }: QuickActionCardProps) {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant="outline"
            className="flex flex-col items-center justify-center h-24 space-y-2 whitespace-normal text-center"
            onClick={action.onClick}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

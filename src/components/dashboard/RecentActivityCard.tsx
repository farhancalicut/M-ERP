import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
}

interface RecentActivityCardProps {
  title?: string;
  activities: ActivityItem[];
}

export function RecentActivityCard({ title = "Recent Activity", activities }: RecentActivityCardProps) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">No recent activity.</div>
        ) : (
          <div className="space-y-4">
            {activities.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary self-start shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{item.time}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

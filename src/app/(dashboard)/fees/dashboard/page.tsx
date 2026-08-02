import { Metadata } from "next";
import { FeeDashboardClient } from "@/features/fees/components/FeeDashboardClient";

export const metadata: Metadata = {
  title: "Fee Dashboard | M-ERP",
  description: "Advanced Fee Dashboard for Management and Principals",
};

export default function FeeDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fee Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of fee collections and pending verifications.
        </p>
      </div>

      <FeeDashboardClient />
    </div>
  );
}

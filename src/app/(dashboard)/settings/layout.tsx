import { Metadata } from "next";
import { SettingsTabs } from "@/features/settings/components/SettingsTabs";

export const metadata: Metadata = {
  title: "Settings | M-ERP",
  description: "Manage system configurations and personal settings."
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
        <p className="text-muted-foreground">
          Manage your system preferences and account settings.
        </p>
      </div>
      <SettingsTabs />
      <div className="pt-2 pb-8">
        {children}
      </div>
    </div>
  );
}

import { Metadata } from "next";
import { AcademicSettingsForm } from "@/features/settings/components/AcademicSettingsForm";

export const metadata: Metadata = {
  title: "Academic Settings | M-ERP",
  description: "Manage your academic years and classes.",
};

export default function AcademicSettingsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Academic Settings</h1>
        <p className="text-muted-foreground">Manage your academic years and classes.</p>
      </div>
      <AcademicSettingsForm />
    </div>
  );
}

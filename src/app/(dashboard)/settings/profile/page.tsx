"use client";

import { ProfileForm } from "@/features/settings/components/ProfileForm";
import { PasswordForm } from "@/features/settings/components/PasswordForm";

export default function ProfilePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}

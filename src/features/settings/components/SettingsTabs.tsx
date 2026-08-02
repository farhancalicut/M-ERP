"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const tabs = [
  { name: "General", href: "/settings/general", roles: ["MANAGEMENT"] },
  { name: "Academic", href: "/settings/academic", roles: ["MANAGEMENT", "PRINCIPAL"] },
  { name: "Class Config", href: "/settings/classes", roles: ["MANAGEMENT", "PRINCIPAL"] },
  { name: "Subject Config", href: "/settings/subjects", roles: ["MANAGEMENT", "PRINCIPAL"] },
  { name: "Grades", href: "/settings/grades", roles: ["MANAGEMENT", "PRINCIPAL"] },
  { name: "Attendance", href: "/settings/attendance", roles: ["MANAGEMENT", "PRINCIPAL"] },
  { name: "Promotion", href: "/settings/promotion", roles: ["MANAGEMENT", "PRINCIPAL"] },

  { name: "Fee Management", href: "/settings/fees-management", roles: ["MANAGEMENT"] },
  { name: "Appearance", href: "/settings/appearance", roles: ["MANAGEMENT", "PRINCIPAL", "TEACHER", "PARENT", "ALUMNI"] },
  { name: "Profile", href: "/settings/profile", roles: ["MANAGEMENT", "PRINCIPAL", "TEACHER", "PARENT", "ALUMNI"] },
  { name: "Subscription", href: "/settings/subscription", roles: ["MANAGEMENT"] },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const { userData } = useAuthStore();

  if (!userData) return null;

  const allowedTabs = tabs.filter(tab => tab.roles.includes(userData.role));

  return (
    <div className="flex space-x-4 border-b pb-4 overflow-x-auto scrollbar-hide">
      {allowedTabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
            pathname.startsWith(tab.href)
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
}

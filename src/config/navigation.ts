import { Role } from "@/types/enums";
import { Users, BookOpen, UserCheck, CreditCard, BarChart, Settings, Home, Bell, FileText, ClipboardList, TrendingUp, GraduationCap, Archive } from "lucide-react";

export const navigationConfig: Partial<Record<Role, { title: string; href: string; icon: React.ElementType }[]>> = {
  SUPER_ADMIN: [
    { title: "Dashboard", href: "/management", icon: Home },
    { title: "Finance", href: "/finance", icon: CreditCard },
    { title: "Notices", href: "/notices", icon: Bell },
    { title: "Reports", href: "/reports", icon: BarChart },
    { title: "Alumni Directory", href: "/alumni", icon: GraduationCap },
    { title: "Settings", href: "/settings", icon: Settings },
  ],
  MANAGEMENT: [
    { title: "Dashboard", href: "/management", icon: Home },
    { title: "Students", href: "/students", icon: Users },
    { title: "Parents", href: "/parents", icon: Users },
    { title: "Staff", href: "/staff", icon: UserCheck },
    { title: "Attendance", href: "/attendance", icon: UserCheck },
    { title: "Finance", href: "/finance", icon: CreditCard },
    { title: "Notices", href: "/notices", icon: Bell },
    { title: "Reports", href: "/reports", icon: BarChart },
    { title: "Alumni Directory", href: "/alumni", icon: GraduationCap },
    { title: "Settings", href: "/settings/general", icon: Settings },
  ],
  PRINCIPAL: [
    { title: "Dashboard", href: "/principal", icon: Home },
    { title: "Students", href: "/students", icon: Users },
    { title: "Parents", href: "/parents", icon: Users },
    { title: "Attendance", href: "/attendance", icon: UserCheck },
    { title: "Exams", href: "/exams", icon: FileText },
    { title: "Marks", href: "/marks", icon: ClipboardList },
    { title: "Results", href: "/results", icon: TrendingUp },
    { title: "Notices", href: "/notices", icon: Bell },
    { title: "Promotions", href: "/promotion", icon: Archive },
    { title: "Alumni Directory", href: "/alumni", icon: GraduationCap },
    { title: "Settings", href: "/settings/academic", icon: Settings },
  ],
  TEACHER: [
    { title: "Dashboard", href: "/teacher", icon: Home },
    { title: "Attendance", href: "/attendance", icon: UserCheck },
    { title: "Exams", href: "/exams", icon: FileText },
    { title: "Marks", href: "/marks", icon: ClipboardList },
    { title: "Collect Fees", href: "/finance", icon: CreditCard },
  ],
  PARENT: [
    { title: "Dashboard", href: "/parent", icon: Home },
    { title: "Attendance", href: "/parent/attendance", icon: UserCheck },
    { title: "Study Materials", href: "/parent/study-materials", icon: BookOpen },
    { title: "Homework", href: "/parent/homework", icon: FileText },
    { title: "Assignments", href: "/parent/assignments", icon: ClipboardList },
    { title: "Fees", href: "/parent/fees", icon: CreditCard },
    { title: "Results", href: "/parent/results", icon: TrendingUp },
  ],
  ALUMNI: [
    { title: "Dashboard", href: "/alumni", icon: Home },
    { title: "Donations", href: "/alumni/donations", icon: CreditCard },
    { title: "News", href: "/alumni/news", icon: Bell },
  ]
};

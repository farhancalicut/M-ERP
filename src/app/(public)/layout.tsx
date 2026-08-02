import { PublicRoute } from "@/features/auth/components/PublicRoute";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicRoute>{children}</PublicRoute>;
}

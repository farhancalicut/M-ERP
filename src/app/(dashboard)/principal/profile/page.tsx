import { Metadata } from "next";
import { PrincipalProfileClient } from "@/features/principal/components/PrincipalProfileClient";

export const metadata: Metadata = {
  title: "Principal Profile | School ERP",
  description: "View principal profile, leaves, and salary information.",
};

export default function PrincipalProfilePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PrincipalProfileClient />
    </div>
  );
}

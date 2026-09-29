import { Suspense } from "react";
import ParentProfileClient from "./_client";

export default function ParentProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>}>
      <ParentProfileClient />
    </Suspense>
  );
}

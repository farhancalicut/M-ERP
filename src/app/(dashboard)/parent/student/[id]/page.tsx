import { Suspense } from "react";
import StudentProfileClient from "./_client";

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>}>
      <StudentProfileClient studentId={params.id} />
    </Suspense>
  );
}

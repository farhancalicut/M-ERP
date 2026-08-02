import { AssignmentFormClient } from "@/features/academic/components/AssignmentFormClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EditAssignmentPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Assignment</h1>
          <p className="text-muted-foreground">
            Update assignment details and attachments.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <AssignmentFormClient assignmentId={params.id} />
      </div>
    </div>
  );
}

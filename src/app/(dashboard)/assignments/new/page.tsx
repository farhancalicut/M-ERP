import { AssignmentFormClient } from "@/features/academic/components/AssignmentFormClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewAssignmentPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Assignment</h1>
          <p className="text-muted-foreground">
            Assign offline work or projects to a class.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <AssignmentFormClient />
      </div>
    </div>
  );
}

import { HomeworkFormClient } from "@/features/academic/components/HomeworkFormClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewHomeworkPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/homework">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Homework</h1>
          <p className="text-muted-foreground">
            Assign homework to a class and subject.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <HomeworkFormClient />
      </div>
    </div>
  );
}

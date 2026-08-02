import { HomeworkFormClient } from "@/features/academic/components/HomeworkFormClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { notFound } from "next/navigation";

export default async function EditHomeworkPage({ params }: { params: { id: string } }) {
  // We can fetch data server-side or pass id to client component and fetch there.
  // Since we use client component for the form, and need the madrassa validation, let's fetch in client.
  // Wait, I can fetch here if I want but I don't have user context easily. I will just pass the ID to the client wrapper.
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/homework">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Homework</h1>
          <p className="text-muted-foreground">
            Update homework details and attachments.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        {/* We need to create an Edit wrapper or fetch in HomeworkFormClient. Let's update HomeworkFormClient to handle fetching if id is provided */}
        <HomeworkFormClient homeworkId={params.id} />
      </div>
    </div>
  );
}

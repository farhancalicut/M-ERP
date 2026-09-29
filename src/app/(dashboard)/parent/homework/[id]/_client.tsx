"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { submissionService } from "@/features/academic/services/submissionService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubmissionForm } from "@/features/academic/components/SubmissionForm";
import { toast } from "sonner";
import { FilePreview } from "@/components/shared/FilePreview";
import { HomeworkSubmissionValues } from "@/features/academic/schemas/academicSchemas";
import { Badge } from "@/components/ui/badge";

export default function ParentHomeworkDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const { userData, user } = useAuthStore();
  
  const [homework, setHomework] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!studentId) {
      router.push("/parent/homework");
      return;
    }

    if ((userData as any)?.madrassaId) {
      Promise.all([
        homeworkService.getHomework(params.id),
        submissionService.getSubmission(params.id, studentId)
      ]).then(([hwRes, subRes]) => {
        if (!hwRes || hwRes.madrassaId !== (userData as any).madrassaId) {
          router.push("/parent/homework");
        } else {
          setHomework(hwRes);
          setSubmission(subRes);
        }
        setLoading(false);
      });
    }
  }, [params.id, studentId, userData, router]);

  const handleSubmit = async (data: HomeworkSubmissionValues) => {
    if (!(userData as any)?.madrassaId || !studentId) return;
    try {
      setSubmitting(true);
      await submissionService.submitHomework(
        (userData as any).madrassaId,
        homework!.academicYearId,
        params.id,
        studentId,
        (user as any).uid || (userData as any).id,
        data
      );
      toast.success("Homework submitted successfully");
      router.refresh();
      // Fetch latest
      const freshSub = await submissionService.getSubmission(params.id, studentId);
      setSubmission(freshSub);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit homework");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!homework) return null;

  const isClosed = homework.status === "CLOSED";
  const canSubmit = (homework.allowSubmission ?? true) && !isClosed;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent/homework">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{homework.title}</h1>
          <p className="text-muted-foreground">
            Due: {homework.dueDate ? new Date(homework.dueDate.seconds * 1000).toLocaleDateString() : "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Description</h3>
            <p className="whitespace-pre-wrap text-sm">{homework.description}</p>
            
            {homework.attachments && homework.attachments.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {homework.attachments.map((att: any, i: number) => (
                    <FilePreview key={i} attachment={att} showDownload={true} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Submission</h3>
              {submission && (
                <Badge variant={submission.reviewed ? "default" : "secondary"}>
                  {submission.reviewed ? "REVIEWED" : "SUBMITTED"}
                </Badge>
              )}
            </div>
            
            {isClosed && !submission && (
              <div className="p-4 bg-muted text-muted-foreground rounded text-center">
                Homework is closed. No submission was made.
              </div>
            )}

            {(!isClosed || submission) && (
              <SubmissionForm 
                initialData={submission} 
                onSubmit={handleSubmit} 
                isLoading={submitting} 
                disabled={!canSubmit || submission?.reviewed} 
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Teacher Remarks</h3>
            {submission?.reviewed ? (
              <div className="p-4 bg-green-50 text-green-900 border border-green-200 rounded text-sm">
                {submission.remarks || "Reviewed with no remarks."}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not reviewed yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

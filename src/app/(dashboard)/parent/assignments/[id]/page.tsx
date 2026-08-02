"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { assignmentService } from "@/features/academic/services/assignmentService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilePreview } from "@/components/shared/FilePreview";

export default function ParentAssignmentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((userData as any)?.madrassaId) {
      assignmentService.getAssignment(params.id).then(hwRes => {
        if (!hwRes || hwRes.madrassaId !== (userData as any).madrassaId) {
          router.push("/parent/assignments");
        } else {
          setAssignment(hwRes);
        }
        setLoading(false);
      });
    }
  }, [params.id, userData, router]);

  if (loading) return <div>Loading...</div>;
  if (!assignment) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent/assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{assignment.title}</h1>
          <p className="text-muted-foreground">
            Due: {assignment.dueDate ? new Date(assignment.dueDate.seconds * 1000).toLocaleDateString() : "-"}
            {" • "}
            Total Marks: {assignment.totalMarks}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Description</h3>
        <p className="whitespace-pre-wrap text-sm">{assignment.description}</p>
        
        {assignment.attachments && assignment.attachments.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Attachments & Materials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignment.attachments.map((att: any, i: number) => (
                <FilePreview key={i} attachment={att} showDownload={true} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 text-blue-900 p-4 rounded-lg text-sm border border-blue-200">
        <p className="font-semibold">Offline Assignment</p>
        <p>This assignment must be completed offline. Please check the instructions provided by the teacher and submit your work directly in class.</p>
      </div>
    </div>
  );
}

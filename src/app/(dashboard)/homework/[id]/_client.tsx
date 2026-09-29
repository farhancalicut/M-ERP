"use client";

import { useEffect, useState } from "react";
import { homeworkService } from "@/features/academic/services/homeworkService";
import { submissionService } from "@/features/academic/services/submissionService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, CheckCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { FilePreview } from "@/components/shared/FilePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { studentService } from "@/features/students/services/studentService";

export default function TeacherHomeworkSubmissionsPage({ params }: { params: { id: string } }) {
  const { userData, user } = useAuthStore();
  const [homework, setHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Review Dialog State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if ((userData as any)?.madrassaId) {
      homeworkService.getHomework(params.id).then(async (hw) => {
        if (!hw || hw.madrassaId !== (userData as any).madrassaId) {
          setLoading(false);
          return;
        }

        // Access control check: Teachers can only view submissions for their assigned classes
        if (userData?.role === "TEACHER") {
          const assignedIds = userData.assignedClassIds || [];
          if (!assignedIds.includes(hw.classId)) {
            setPermissionError("Access Denied: You are not authorized to view submissions for this class.");
            toast.error("You are only permitted to view submissions for your assigned classes.");
            setLoading(false);
            return;
          }
        }

        setHomework(hw);
        
        // Fetch submissions
        const subRes = await submissionService.getSubmissionsByHomework((userData as any).madrassaId, params.id, undefined, 100);
        setSubmissions(subRes.submissions);

        // Fetch students in this class to map names
        const stuRes = await studentService.searchStudents((userData as any).madrassaId, { classId: hw.classId }, 200);
        const sMap: Record<string, any> = {};
        stuRes.students.forEach((s: any) => { sMap[s.id] = s; });
        setStudentsMap(sMap);
        
        // Merge to show all students, even those who haven't submitted
        const mergedSubmissions = stuRes.students.map((student: any) => {
          const existingSub = subRes.submissions.find(s => s.studentId === student.id);
          if (existingSub) return existingSub;
          
          // Return a placeholder for students who haven't submitted
          return {
            id: `pending_${student.id}`,
            studentId: student.id,
            status: 'PENDING',
            reviewed: false,
            isPlaceholder: true // flag to prevent empty review submissions
          };
        });
        
        setSubmissions(mergedSubmissions);
        setLoading(false);
      }).catch((err) => {
        toast.error("Failed to load homework details");
        setLoading(false);
      });
    }
  }, [params.id, userData]);

  const handleReview = async () => {
    if (!selectedSubmission || !user) return;
    try {
      setIsReviewing(true);
      await submissionService.reviewSubmission(selectedSubmission.id, { remarks }, user.uid);
      
      // Update local state
      setSubmissions(prev => prev.map(s => 
        s.id === selectedSubmission.id ? { ...s, reviewed: true, remarks, status: 'REVIEWED' } : s
      ));
      
      toast.success("Submission marked as reviewed");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  const columns = [
    {
      header: "Student",
      accessorKey: "studentId",
      cell: ({ row }: any) => <div className="font-medium">{studentsMap[row.original.studentId]?.name || row.original.studentId}</div>
    },
    {
      header: "Submitted At",
      accessorKey: "submittedAt",
      cell: ({ row }: any) => row.original.submittedAt ? new Date(row.original.submittedAt.seconds * 1000).toLocaleString() : "-"
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => {
        if (row.original.isPlaceholder) return <Badge variant="secondary">NOT SUBMITTED</Badge>;
        return (
          <Badge variant={row.original.reviewed ? "default" : "secondary"}>
            {row.original.reviewed ? "REVIEWED" : "SUBMITTED"}
          </Badge>
        );
      }
    },
    {
      header: "Action",
      id: "actions",
      cell: ({ row }: any) => (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={row.original.isPlaceholder}
          onClick={() => {
            setSelectedSubmission(row.original);
            setRemarks(row.original.remarks || "");
            setDialogOpen(true);
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading submissions...</div>;

  if (permissionError) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-card border rounded-lg text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">{permissionError}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/homework">Return to Homework List</Link>
        </Button>
      </div>
    );
  }

  if (!homework) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/homework">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Submissions: {homework.title}</h1>
            <p className="text-muted-foreground">
              Review homework submitted by students. Click Preview on attachments to view submitted work directly.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={submissions}
          searchKey="studentId"
          hideActions={true}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Submission - {selectedSubmission && studentsMap[selectedSubmission.studentId]?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6 pt-4">
              {selectedSubmission.submissionText && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Student Remarks / Text</h4>
                  <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedSubmission.submissionText}
                  </div>
                </div>
              )}

              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSubmission.attachments.map((att: any, i: number) => (
                      <FilePreview key={i} attachment={att} showDownload={true} />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-semibold">Teacher Remarks (Optional)</h4>
                <Textarea 
                  placeholder="Add feedback for the student..." 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isReviewing}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isReviewing}>
                  Close
                </Button>
                <Button onClick={handleReview} disabled={isReviewing}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Reviewed
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

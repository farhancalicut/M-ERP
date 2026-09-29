"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { leaveService, CreateStaffLeaveData } from "@/features/leave/services/leaveService";
import { LeaveRequest, LeaveType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, CalendarOff, Clock, CheckCircle2, XCircle, Users, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "SICK", label: "Sick Leave" },
  { value: "PERSONAL", label: "Personal" },
  { value: "FAMILY", label: "Family Event" },
  { value: "OTHER", label: "Other" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function formatDateRange(from: any, to: any) {
  const f = from?.toDate ? from.toDate() : new Date(from);
  const t = to?.toDate ? to.toDate() : new Date(to);
  if (format(f, "yyyy-MM-dd") === format(t, "yyyy-MM-dd")) return format(f, "dd MMM yyyy");
  return `${format(f, "dd MMM")} – ${format(t, "dd MMM yyyy")}`;
}

function ReviewDialog({
  request,
  onClose,
  onDone,
}: {
  request: LeaveRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { userData } = useAuthStore();
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReview = async () => {
    if (!action || !request?.id || !userData) return;
    if (action === "REJECTED" && !note.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setLoading(true);
    try {
      await leaveService.reviewLeave(request.id, action, userData.uid, userData.displayName, note.trim() || undefined);
      toast.success(`Leave request ${action.toLowerCase()} successfully.`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to review leave.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Leave Request</DialogTitle>
          <DialogDescription>
            {request && `${request.requesterName} — ${formatDateRange(request.fromDate, request.toDate)}`}
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <div className="flex gap-2"><span className="text-muted-foreground w-20">Type:</span><Badge variant="outline">{request.leaveType}</Badge></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-20">Reason:</span><span>{request.reason}</span></div>
            </div>
            <div className="space-y-2">
              <Label>Decision</Label>
              <div className="flex gap-2">
                <Button
                  variant={action === "APPROVED" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setAction("APPROVED")}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button
                  variant={action === "REJECTED" ? "destructive" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setAction("REJECTED")}
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
            {action === "REJECTED" && (
              <div className="space-y-1.5">
                <Label>Rejection Note <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Explain why this request is being rejected..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}
            {action === "APPROVED" && (
              <div className="space-y-1.5">
                <Label>Note (Optional)</Label>
                <Textarea
                  placeholder="Any additional note for the parent..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReview} disabled={!action || loading}>
            {loading ? "Saving..." : "Confirm Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherLeavePage() {
  const { userData } = useAuthStore();
  const [studentRequests, setStudentRequests] = useState<LeaveRequest[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [ownDialogOpen, setOwnDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({ leaveType: "SICK" as LeaveType, fromDate: today, toDate: today, reason: "" });

  const loadData = async () => {
    if (!userData?.madrassaId) return;
    setLoading(true);
    try {
      const assignedClassIds: string[] = (userData as any).assignedClassIds || [];
      // Student leave requests for the teacher's assigned classes
      const studentFilters: { type: "STUDENT"; classIds?: string[] } = { type: "STUDENT" };
      if (assignedClassIds.length > 0) studentFilters.classIds = assignedClassIds;
      const { requests: studentReqs } = await leaveService.getLeaveRequests(
        userData.madrassaId,
        studentFilters,
        100
      );
      setStudentRequests(studentReqs);

      // Own leave requests
      const { requests: myReqs } = await leaveService.getLeaveRequests(
        userData.madrassaId,
        { type: "STAFF", requesterId: userData.uid },
        50
      );
      setMyRequests(myReqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userData]);

  const handleOwnSubmit = async () => {
    if (!userData?.madrassaId || !form.reason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const data: CreateStaffLeaveData = {
        madrassaId: userData.madrassaId,
        userId: userData.uid,
        staffName: userData.displayName,
        role: userData.role,
        leaveType: form.leaveType,
        fromDate: new Date(form.fromDate),
        toDate: new Date(form.toDate),
        reason: form.reason.trim(),
        createdBy: userData.uid,
      };
      await leaveService.createStaffLeave(data);
      toast.success("Leave request submitted.");
      setOwnDialogOpen(false);
      setForm({ leaveType: "SICK", fromDate: today, toDate: today, reason: "" });
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit leave.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = studentRequests.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-primary" />
          Leave Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Review student leave requests and manage your own leaves.</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Student Requests
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white text-xs ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-leave" className="gap-2">
            <User className="h-4 w-4" />
            My Leave
          </TabsTrigger>
        </TabsList>

        {/* === Student Requests Tab === */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Leave Requests</CardTitle>
              <CardDescription>Leave requests from students in your assigned classes.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">Loading...</div>
              ) : studentRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No student leave requests found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRequests.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.requesterName}</TableCell>
                        <TableCell className="text-sm">{formatDateRange(r.fromDate, r.toDate)}</TableCell>
                        <TableCell><Badge variant="outline">{r.leaveType}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{r.reason}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          {r.status === "PENDING" ? (
                            <Button size="sm" variant="outline" onClick={() => setReviewTarget(r)}>
                              Review
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {r.reviewerNote ? `"${r.reviewerNote}"` : r.reviewerName || "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === My Leave Tab === */}
        <TabsContent value="my-leave">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">My Leave Requests</CardTitle>
                <CardDescription>Your submitted leave requests and their status.</CardDescription>
              </div>
              <Button onClick={() => setOwnDialogOpen(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Request Leave
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">Loading...</div>
              ) : myRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>You have not submitted any leave requests yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dates</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewer Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{formatDateRange(r.fromDate, r.toDate)}</TableCell>
                        <TableCell><Badge variant="outline">{r.leaveType}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{r.reason}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.reviewerNote || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <ReviewDialog request={reviewTarget} onClose={() => setReviewTarget(null)} onDone={loadData} />

      {/* Own Leave Request Dialog */}
      <Dialog open={ownDialogOpen} onOpenChange={setOwnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request My Leave</DialogTitle>
            <DialogDescription>Your request will be reviewed by Management or the Principal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={form.leaveType} onValueChange={v => setForm(f => ({ ...f, leaveType: v as LeaveType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date</Label>
                <Input type="date" min={today} value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To Date</Label>
                <Input type="date" min={form.fromDate} value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Describe the reason for your leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOwnSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

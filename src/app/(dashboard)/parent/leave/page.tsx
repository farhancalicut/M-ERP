"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { leaveService, CreateStudentLeaveData } from "@/features/leave/services/leaveService";
import { LeaveRequest, LeaveType } from "@/types/schema";
import { studentService } from "@/features/students/services/studentService";
import { Student } from "@/features/students/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, CalendarOff, Clock, CheckCircle2, XCircle } from "lucide-react";
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

export default function ParentLeavePage() {
  const { userData } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    studentId: "",
    leaveType: "SICK" as LeaveType,
    fromDate: today,
    toDate: today,
    reason: "",
  });

  const loadData = async () => {
    if (!userData?.madrassaId || userData.role !== "PARENT") return;
    setLoading(true);
    try {
      const myStudents = await studentService.getStudentsByParent(userData.madrassaId, (userData as any).domainId || userData.uid);
      setStudents(myStudents as Student[]);
      if (myStudents.length > 0 && !form.studentId) {
        setForm(f => ({ ...f, studentId: myStudents[0]!.studentId }));
      }
      const { requests: reqs } = await leaveService.getLeaveRequests(
        userData.madrassaId,
        { type: "STUDENT", parentUserId: userData.uid },
        50
      );
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userData]);

  const handleSubmit = async () => {
    if (!userData?.madrassaId) return;
    if (!form.studentId || !form.reason.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const student = students.find(s => s.studentId === form.studentId);
    if (!student) return;

    setSubmitting(true);
    try {
      const data: CreateStudentLeaveData = {
        madrassaId: userData.madrassaId,
        studentId: student.studentId,
        studentName: student.name,
        classId: student.classId,
        parentUserId: userData.uid,
        leaveType: form.leaveType,
        fromDate: new Date(form.fromDate),
        toDate: new Date(form.toDate),
        reason: form.reason.trim(),
        createdBy: userData.uid,
      };
      await leaveService.createStudentLeave(data);
      toast.success("Leave request submitted successfully!");
      setDialogOpen(false);
      setForm({ studentId: students[0]?.studentId || "", leaveType: "SICK", fromDate: today, toDate: today, reason: "" });
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-primary" />
            Leave Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Request and track leave for your child.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave History</CardTitle>
          <CardDescription>All submitted leave requests and their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No leave requests yet.</p>
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
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requesterName}</TableCell>
                    <TableCell className="text-sm">{formatDateRange(r.fromDate, r.toDate)}</TableCell>
                    <TableCell><Badge variant="outline">{r.leaveType}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reviewerNote || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Submit a leave request for your child. Only today and future dates are allowed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {students.length > 1 && (
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.studentId} value={s.studentId}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                <Input type="date" min={today} value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value, toDate: e.target.value >= f.toDate ? e.target.value : f.toDate }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To Date</Label>
                <Input type="date" min={form.fromDate} value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe the reason for leave..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { attendanceReportService } from "@/features/reports/services/attendanceReportService";
import { ParentStudentSwitcher } from "@/components/shared/ParentStudentSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { Attendance } from "@/types/schema";
import { Student } from "@/features/students/types";

export default function ParentAttendancePage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [attendanceDocs, setAttendanceDocs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId && userData?.role === "PARENT") {
      const parentIdentifier = (userData as any).domainId || (userData as any).uid || userData.id;
      studentService.getStudentsByParent(userData.madrassaId, parentIdentifier).then(myStudents => {
        setStudents(myStudents as Student[]);
        if (myStudents.length > 0 && !selectedStudentId) {
          const firstId = myStudents[0]?.studentId;
          setSelectedStudentId(firstId ?? "");
        } else if (myStudents.length === 0) {
          setLoading(false);
        }
      });
    } else if (userData) {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (selectedStudentId && userData?.madrassaId && currentAcademicYear?.id) {
      setLoading(true);
      // Fetch attendance for the selected student
      attendanceReportService.generateStudentAttendanceReport(
        userData.madrassaId,
        selectedStudentId,
        currentAcademicYear.id
      ).then(docs => {
        setAttendanceDocs(docs);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load attendance", err);
        setLoading(false);
      });

      // Update URL silently
      const url = new URL(window.location.href);
      url.searchParams.set("studentId", selectedStudentId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedStudentId, userData, currentAcademicYear]);

  if (loading) return <div>Loading...</div>;

  // Compute stats
  let totalDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let lateDays = 0;

  const records = attendanceDocs.map(doc => {
    const record = doc.attendance[selectedStudentId];
    if (record) {
      totalDays++;
      if (record.status === "PRESENT") presentDays++;
      if (record.status === "ABSENT") absentDays++;
      if (record.status === "LEAVE") leaveDays++;
      if ((record.status as any) === "LATE") lateDays++;
    }
    return {
      date: doc.date,
      status: record?.status || "UNKNOWN",
      remarks: record?.remarks || "-"
    };
  }).filter(r => r.status !== "UNKNOWN");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">View your child&apos;s daily attendance records.</p>
        </div>
        <ParentStudentSwitcher 
          students={students} 
          selectedStudentId={selectedStudentId} 
          onStudentChange={setSelectedStudentId} 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Total Days</CardTitle>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Present</CardTitle>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Absent</CardTitle>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Leave</CardTitle>
            <div className="text-2xl font-bold text-blue-600">{leaveDays}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Late</CardTitle>
            <div className="text-2xl font-bold text-yellow-600">{lateDays}</div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{format(parseISO(r.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={
                        (r.status === "PRESENT" ? "success" : 
                         r.status === "ABSENT" ? "destructive" : 
                         r.status === "LEAVE" ? "secondary" : 
                         "outline") as any
                      }>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              No attendance records found for this student in the current academic year.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IndianRupee } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function ParentFeesPage() {
  const { userData, currentAcademicYear } = useAuthStore();
  const [students, setStudents] = useState<any[]>([]);
  const [studentFeesList, setStudentFeesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.madrassaId && currentAcademicYear?.id && userData.role === "PARENT") {
      const academicYearId = currentAcademicYear.id;
      const parentIdentifier = (userData as any).domainId || userData.id;
      studentService.getStudentsByParent(userData.madrassaId, parentIdentifier).then(myStudents => {
        setStudents(myStudents);
        
        Promise.all(myStudents.map((s: any) => studentFeeService.getStudentFees(s.id || s.studentId, academicYearId)))
          .then(fees => {
            setStudentFeesList(fees);
            setLoading(false);
          });
      });
    } else if (userData) {
      setLoading(false);
    }
  }, [userData]);

  if (loading) return <div>Loading...</div>;
  if (!currentAcademicYear?.id) return <div>No active academic year found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fee Dashboard</h1>
        <p className="text-muted-foreground">
          View your children&apos;s fee dues and payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.filter(s => s).map((student: any, i) => {
          const fees: any = studentFeesList[i];
          const due = fees?.dueAmount || 0;
          const status = fees?.status || "PENDING";
          
          const id = student.id || student.studentId;
          return (
            <Card key={id}>
              <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div>
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Class: {student.className || student.classId}</p>
                </div>
                <Badge
                  variant={(status === "PAID" ? "success" : status === "PARTIAL" ? "warning" : "destructive") as any}
                >
                  {status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-t">
                  <span className="text-sm font-medium">Total Due:</span>
                  <span className="text-xl font-bold text-red-600">₹{due.toFixed(2)}</span>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/parent/fees/${id}`}>
                    <IndianRupee className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {students.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border rounded-lg border-dashed">
            No active students found.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { useAuthStore } from "@/stores/authStore";
import { studentService } from "@/features/students/services/studentService";
import { Student } from "@/features/students/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CreditCard, BookOpen, Users } from "lucide-react";
import { NoticeBoardWidget } from "@/features/notifications/components/NoticeBoardWidget";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export default function ParentDashboard() {
  const { userData } = useAuthStore();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      if (userData?.madrassaId && userData?.id) {
        setLoading(true);
        try {
          // In Phase 17, Parents are linked to Students via their domainId (e.g. PAR0001) instead of their Firebase Auth UID.
          let parentIdentifier = (userData as any).domainId;
          
          if (!parentIdentifier) {
            // Self-heal: find parent document by email and update
            const parentQuery = query(collection(db, "parents"), where("email", "==", userData.email));
            const parentDocs = await getDocs(parentQuery);
            if (!parentDocs.empty) {
              const parentDoc = parentDocs.docs[0];
              parentIdentifier = parentDoc.id;
              // Heal the DB automatically
              await updateDoc(doc(db, "parents", parentDoc.id), { userId: userData.id }).catch(() => {});
              await updateDoc(doc(db, "users", userData.id), { domainId: parentDoc.id }).catch(() => {});
            } else {
              parentIdentifier = userData.id; // fallback
            }
          }

          const students = await studentService.getStudentsByParent(userData.madrassaId, parentIdentifier);
          setChildren(students);
          if (students.length > 0) {
            setSelectedChildId(students[0]?.studentId || "");
          }
        } catch (error) {
          console.error("Failed to load children", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchChildren();
  }, [userData?.madrassaId, userData?.id, (userData as any)?.domainId, userData?.email]);

  const selectedChild = children.find(c => c.studentId === selectedChildId);

  return (
    <RoleGuard allowedRoles="PARENT">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
            <p className="text-muted-foreground mt-1">View your children's progress and updates.</p>
          </div>
          
          {!loading && children.length > 0 && (
            <div className="w-full md:w-64">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.studentId} value={child.studentId!}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : children.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">No Children Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find any student records linked to your account. Please contact the madrassa administration.
            </p>
          </div>
        ) : selectedChild ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Student Profile</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedChild.name}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Admission No: {selectedChild.admissionNo}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Attendance & Schedule</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    View daily attendance and timetable.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/parent/attendance?studentId=${selectedChild.studentId}`}>View Attendance</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Fee Status</CardTitle>
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check pending dues and payment history.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/parent/fees?studentId=${selectedChild.studentId}`}>View Fees</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <DashboardSection title="Recent Updates">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-primary" />
                      Academic Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Homework, study materials, and examination results.
                    </p>
                    <div className="space-y-2">
                      <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href={`/parent/homework?studentId=${selectedChild.studentId}`}>Homework & Assignments</Link>
                      </Button>
                      <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href={`/parent/study-materials?studentId=${selectedChild.studentId}`}>Study Materials</Link>
                      </Button>
                      <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href={`/parent/exams?studentId=${selectedChild.studentId}`}>Examination Results</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {userData?.madrassaId && (
                  <NoticeBoardWidget madrassaId={userData.madrassaId} role="PARENT" />
                )}
              </div>
            </DashboardSection>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { studentService } from "@/features/students/services/studentService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";
import { paymentService } from "@/features/fees/services/paymentService";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { classService } from "@/features/academic/services/classService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, History, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ReceiptModal } from "@/features/fees/components/ReceiptModal";

function ParentFeesDashboardContent() {
  const { userData, currentAcademicYear, madrassa } = useAuthStore();
  const searchParams = useSearchParams();
  const requestedStudentId = searchParams?.get("studentId");

  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);

  // Load children list on mount
  useEffect(() => {
    async function init() {
      if (!userData?.madrassaId || !currentAcademicYear?.id || userData.role !== "PARENT") {
        if (userData) setLoading(false);
        return;
      }
      try {
        const parentIdentifier = (userData as any).domainId || userData.id;
        const myStudents = await studentService.getStudentsByParent(userData.madrassaId, parentIdentifier);
        setStudents(myStudents);
        let target = myStudents[0];
        if (requestedStudentId) {
          const found = myStudents.find((s: any) => (s.id || s.studentId) === requestedStudentId);
          if (found) target = found;
        }
        if (target) await loadStudentData(target, myStudents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [userData, currentAcademicYear]);

  const loadStudentData = async (student: any, allStudents?: any[]) => {
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    const stuList = allStudents || students;
    setLoadingStudent(true);
    try {
      const studentId = student.id || student.studentId;

      const [fees, pmts, feeCatsResult, classesResult] = await Promise.all([
        studentFeeService.getStudentFees(studentId, currentAcademicYear.id),
        paymentService.getStudentPayments(userData.madrassaId, studentId, currentAcademicYear.id),
        feeCategoryService.getFeeCategories(userData.madrassaId, undefined, 100),
        classService.getClasses(userData.madrassaId, undefined, undefined, 100),
      ]);

      const feeCatMap = new Map(feeCatsResult.categories.map((c: any) => [c.id, c.name]));
      const classMap = new Map(classesResult.classes.map((c: any) => [c.id, c.name]));

      const enrichedStudent = { ...student };
      if (student.classId) enrichedStudent.className = classMap.get(student.classId) || student.classId;
      pmts.forEach((p: any) => {
        if (p.feeCategoryId && !p.feeName) p.feeName = feeCatMap.get(p.feeCategoryId) || p.feeCategoryId;
      });

      setActiveStudent(enrichedStudent);
      setFeeSummary(fees);
      setPayments(pmts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudent(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading fee dashboard...</div>;
  if (!currentAcademicYear?.id) return <div className="p-8 text-center text-muted-foreground">No active academic year found.</div>;
  if (!activeStudent) return <div className="p-8 text-center text-muted-foreground">No student records found for your account.</div>;

  // FIX: Use assignedFees (not fees)
  const outstandingFees = feeSummary?.assignedFees?.filter((f: any) => f.dueAmount > 0) || [];
  const totalDue = feeSummary?.dueAmount || 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Fee Account</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {madrassa?.name || "Institution"} · {currentAcademicYear.name}
          </p>
        </div>
      </div>

      {/* Child selector (if multiple children) */}
      {students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {students.map((s: any) => {
            const sid = s.id || s.studentId;
            const isActive = activeStudent?.id === sid || activeStudent?.studentId === sid;
            return (
              <button
                key={sid}
                onClick={() => { setActiveStudent(s); loadStudentData(s); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {loadingStudent ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Student info card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {activeStudent.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{activeStudent.name}</p>
                  <p className="text-sm text-muted-foreground">{activeStudent.className || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Fee</p>
                  <p className="font-bold mt-0.5">Rs.{(feeSummary?.totalAmount || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-bold text-green-600 mt-0.5">Rs.{(feeSummary?.paidAmount || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Due</p>
                  <p className="font-bold text-red-600 mt-0.5">Rs.{totalDue.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding dues */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Outstanding Dues</h2>
            </div>
            <Card>
              <CardContent className="p-0">
                {outstandingFees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-green-600">
                    <CheckCircle2 className="w-10 h-10 mb-2 text-green-500" />
                    <h3 className="font-semibold">All dues are cleared!</h3>
                    <p className="text-sm text-muted-foreground mt-1">No outstanding fees for {activeStudent.name}.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {outstandingFees.map((fee: any) => (
                      <div key={fee.id} className="flex justify-between items-center p-4">
                        <div>
                          <h3 className="font-semibold">{fee.feeName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Total: Rs.{fee.amount?.toLocaleString("en-IN")} · Paid: Rs.{fee.paidAmount?.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-0.5">Due</p>
                          <p className="font-bold text-red-600">Rs.{fee.dueAmount.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 flex justify-between items-center bg-muted/30">
                      <span className="font-semibold">Total Outstanding</span>
                      <span className="font-bold text-red-600 text-lg">Rs.{totalDue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {totalDue > 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Please visit the institution office to make your payment.
              </p>
            )}
          </section>

          {/* Payment history */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Payment History</h2>
            </div>
            <Card>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No payment history found.</div>
                ) : (
                  <div className="divide-y">
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold text-sm">Rs.{p.amount.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.createdAt?.toMillis ? format(new Date(p.createdAt.toMillis()), "dd MMM yyyy") : "—"} · {p.paymentMethod} · #{p.paymentNo || p.receiptNo || p.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] font-bold border-0 bg-green-100 text-green-700">
                            {p.feeName || "Fee"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setReceiptPayment(p)}
                          >
                            Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Receipt print modal */}
      <ReceiptModal payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
    </div>
  );
}

export default function ParentFeesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>}>
      <ParentFeesDashboardContent />
    </Suspense>
  );
}
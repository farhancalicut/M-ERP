"use client";

import { Student, StudentFee, FeePayment } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { RecordPaymentSheet } from "./RecordPaymentSheet";
import { ReceiptModal } from "./ReceiptModal";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

interface StudentFeeDashboardClientProps {
  student: Student;
  feeSummary: StudentFee | null;
  payments: FeePayment[];
  className?: string;
}

export function StudentFeeDashboardClient({ student, feeSummary, payments, className: resolvedClassName }: StudentFeeDashboardClientProps) {
  const { userData, currentAcademicYear } = useAuthStore();
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);
  const [localPayments, setLocalPayments] = useState<FeePayment[]>(payments);

  const assignedFees = feeSummary?.assignedFees || [];
  const outstandingFees = assignedFees.filter(f => f.status !== "PAID" && f.status !== "CANCELLED" && f.status !== "WAIVED");
  const totalDue = feeSummary?.dueAmount || 0;
  const totalPaid = feeSummary?.paidAmount || 0;
  const totalFee = feeSummary?.totalAmount || 0;
  const studentId = (student as any).id || (student as any).studentId;

  const handlePaymentClose = () => {
    setPaymentOpen(false);
    // Reload page data via router.refresh (soft refresh, no full reload)
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Student Profile Card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 bg-primary/10 text-primary rounded-xl">
              <AvatarFallback className="bg-primary/10 rounded-xl text-xl font-bold text-primary">
                {student.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {resolvedClassName || "—"} · Adm #{(student as any).studentId || (student as any).admissionNo || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/students/${studentId}`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Profile
            </Button>
            {totalDue > 0 && (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                Collect Fee
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ledger */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fee Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-semibold">Rs.{totalFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-green-600">Rs.{totalPaid.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="font-semibold">Outstanding</span>
                <span className={`font-bold text-base ${totalDue > 0 ? "text-red-600" : "text-green-600"}`}>
                  Rs.{totalDue.toLocaleString("en-IN")}
                </span>
              </div>

              {totalDue === 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-1">
                  <CheckCircle2 className="h-4 w-4" /> All dues cleared
                </div>
              ) : (
                <Button className="w-full mt-2" onClick={() => setPaymentOpen(true)}>
                  Collect Fee
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Outstanding fee categories */}
          {outstandingFees.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Outstanding Dues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outstandingFees.map(fee => (
                  <div key={fee.id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{fee.feeName}</span>
                    <span className="font-bold text-red-600">Rs.{fee.dueAmount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Payment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="divide-y">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Rs.{p.amount.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.paymentDate?.toDate ? format(p.paymentDate.toDate(), "dd MMM yyyy") : "—"} · {p.paymentMethod?.replace("_", " ")} · #{p.paymentNo}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-bold border-0 ${p.status === "VOID" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {p.status === "VOID" ? "VOIDED" : "PAID"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setReceiptPayment(p)}>
                          Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Sheet */}
      {paymentOpen && currentAcademicYear?.id && (
        <RecordPaymentSheet
          isOpen={paymentOpen}
          onClose={handlePaymentClose}
          studentId={studentId}
          academicYearId={currentAcademicYear.id}
        />
      )}

      {/* Receipt Modal */}
      <ReceiptModal payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
    </div>
  );
}
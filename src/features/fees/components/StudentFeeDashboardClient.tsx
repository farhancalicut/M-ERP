"use client";

import { Student, StudentFee, FeePayment, AssignedFee } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IndianRupee, CreditCard, Banknote, History, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { PaymentForm } from "./PaymentForm";
import { paymentService } from "../services/paymentService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { PaymentFormValues } from "../schemas/feeSchemas";


interface StudentFeeDashboardClientProps {
  student: Student;
  feeSummary: StudentFee | null;
  payments: FeePayment[];
  isParent?: boolean;
}

export function StudentFeeDashboardClient({ student, feeSummary, payments, isParent }: StudentFeeDashboardClientProps) {
  const { userData, currentAcademicYear } = useAuthStore();
  const assignedFees = feeSummary?.assignedFees || [];
  
  // Outstanding fees are those not FULLY paid.
  const outstandingFees = assignedFees.filter(f => f.status !== "PAID" && f.status !== "CANCELLED" && f.status !== "WAIVED");
  
  const [selectedFee, setSelectedFee] = useState<AssignedFee | null>(null);

  // Auto-select the first outstanding fee if none is selected
  useEffect(() => {
    if (outstandingFees.length > 0 && !selectedFee) {
      setSelectedFee(outstandingFees[0] as AssignedFee);
    }
  }, [outstandingFees, selectedFee]);

  const handlePaymentSubmit = async (data: PaymentFormValues) => {
    if (!userData || !currentAcademicYear || !selectedFee) {
      toast.error("Missing required data to process payment.");
      return;
    }

    try {
      await paymentService.collectPayment(
        userData.madrassaId,
        (student as any).id || (student as any).studentId,
        student.parentId,
        currentAcademicYear.id as string,
        selectedFee.feeCategoryId,
        selectedFee.id as string,
        data.amount,
        data.paymentMethod as any,
        userData.uid,
        userData.role,
        data.remarks,
        data.paymentDate
      );
      toast.success("Payment recorded successfully!");
      // Short delay before closing/refreshing is handled by parent, or we can just trigger a window reload here.
      // Ideally, the parent sheet handles the close and refresh. For now, since it's inside the sheet, we reload.
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
      throw error; 
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-2">
      
      {/* Left Column: Payment Processing */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Record New Payment</h2>
          <p className="text-muted-foreground mt-1">Enter the details below to process student fee collections.</p>
        </div>

        {/* Student Profile Card */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 bg-teal-800 dark:bg-teal-600 text-white rounded-xl">
                <AvatarFallback className="bg-teal-800 dark:bg-teal-600 rounded-xl text-lg font-bold">
                  {(student.name.substring(0, 2)).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold text-foreground">{student.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Admission #{student.studentId || "N/A"} | Class ID: {student.classId}
                </p>
              </div>
            </div>
            {!isParent && (
              <Button variant="ghost" className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:text-teal-300 hover:bg-teal-50 dark:bg-teal-900/20">
                View Profile
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card className="border shadow-sm bg-card">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedFee ? (
              <div className="text-center p-8 text-muted-foreground">
                <Banknote className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No outstanding fees to pay.</p>
              </div>
            ) : (
              <div className="animate-in fade-in">
                <PaymentForm
                  studentId={(student as any).id || (student as any).studentId}
                  maxAmount={selectedFee.dueAmount}
                  feeName={selectedFee.feeName}
                  role={userData?.role as any}
                  allowPartialPayment={true}
                  action={handlePaymentSubmit}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Ledger & History */}
      <div className="space-y-6">
        
        {/* Student Ledger */}
        <Card className="border shadow-sm bg-muted/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Student Ledger</CardTitle>
            <p className="text-xs text-muted-foreground">Outstanding dues as of today</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 space-y-3">
              {outstandingFees.length === 0 ? (
                <div className="text-sm text-green-600 font-medium py-2">All dues are cleared.</div>
              ) : (
                outstandingFees.map(fee => (
                  <div 
                    key={fee.id} 
                    onClick={() => setSelectedFee(fee)}
                    className={`flex justify-between items-center pb-2 border-b cursor-pointer transition-colors p-2 rounded-md ${
                      selectedFee?.id === fee.id ? "bg-teal-50 dark:bg-teal-900/20 dark:bg-teal-900/20 border-teal-200" : "hover:bg-muted/50 border-transparent border-b-border"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{fee.feeName}</span>
                    <span className="text-sm font-semibold text-foreground">₹{fee.dueAmount.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 px-6 pt-4 border-t flex justify-between items-center mb-6">
              <span className="font-semibold text-foreground">Total Outstanding</span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                ₹{(feeSummary?.dueAmount || 0).toLocaleString()}
              </span>
            </div>

            {feeSummary && feeSummary.dueAmount > 0 && (
              <div className="mx-6 mb-6 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg p-3 flex gap-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>Please select a specific fee from the list above to process its payment.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[250px] overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No recent payments.
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {payments.slice(0, 5).map(payment => (
                    <div key={payment.id} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] last:before:bottom-0 before:w-[2px] before:bg-muted">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 border-2 border-white flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Paid ₹{payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(payment.createdAt?.toMillis ? payment.createdAt.toMillis() : Date.now(), "MMMM d, yyyy")} • Receipt #{payment.paymentNo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {payments.length > 0 && (
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full text-teal-700 dark:text-teal-400 hover:text-teal-800">
                  View Full Statement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

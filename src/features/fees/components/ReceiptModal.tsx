"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeePayment } from "@/types/schema";
import { format } from "date-fns";
import { Printer, Download, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface ReceiptModalProps {
  payment: FeePayment | null;
  studentName?: string;
  onClose: () => void;
}

export function ReceiptModal({ payment, studentName, onClose }: ReceiptModalProps) {
  const { userData, madrassa } = useAuthStore();

  if (!payment) return null;

  const txType = (payment as any).transactionType || "FEE";
  const typeLabel =
    txType === "EXPENSE" ? "Expense Record" : txType === "DONATION" ? "Donation Receipt" : "Fee Receipt";

  const payDate = payment.paymentDate?.toDate
    ? format(payment.paymentDate.toDate(), "dd MMMM yyyy")
    : "-";

  const institutionName = madrassa?.name || "Institution";

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>${typeLabel} - ${payment.paymentNo || payment.receiptNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; }
        .receipt { max-width: 480px; margin: 40px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #0f766e, #0d9488); color: #fff; padding: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header h2 { font-size: 20px; font-weight: 700; }
        .header p { font-size: 12px; color: #ccfbf1; margin-top: 4px; }
        .receipt-no { background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 700; }
        .body { padding: 24px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .row span:first-child { color: #6b7280; }
        .row span:last-child { font-weight: 600; }
        .amount-box { margin-top: 16px; background: #f0fdfa; border-radius: 10px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .amount-box span:first-child { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .amount-box span:last-child { font-size: 28px; font-weight: 800; color: #0f766e; }
        .note { margin-top: 16px; font-size: 11px; text-align: center; color: #9ca3af; }
        .status { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .status-valid { background: #dcfce7; color: #16a34a; }
        .status-void { background: #fee2e2; color: #dc2626; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt { margin: 0; border: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div>
            <h2>${typeLabel}</h2>
            <p>${institutionName}</p>
          </div>
          <div style="text-align:right">
            <span class="receipt-no">${payment.paymentNo || payment.receiptNo || payment.id}</span>
            <p style="font-size:11px;color:#a7f3d0;margin-top:6px">${payDate}</p>
          </div>
        </div>
        <div class="body">
          ${
            studentName
              ? `<div class="row"><span>Student</span><span>${studentName}</span></div>`
              : ""
          }
          <div class="row"><span>Fee / Description</span><span>${payment.remarks || (payment as any).feeName || payment.feeCategoryId || "—"}</span></div>
          <div class="row"><span>Payment Method</span><span>${(payment.paymentMethod || "").replace("_", " ")}</span></div>
          <div class="row"><span>Date</span><span>${payDate}</span></div>
          <div class="row"><span>Status</span><span class="status ${payment.status === "VOID" ? "status-void" : "status-valid"}">${payment.status}</span></div>
          <div class="amount-box">
            <span>Amount Paid</span>
            <span>Rs.${payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <p class="note">This is a computer-generated receipt. No signature required.</p>
        </div>
      </div>
      <script>window.onload = function() { window.print(); }<\/script>
    </body>
    </html>
  `;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(receiptHtml);
    win.document.close();
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0">
        {/* Print Styles — hides everything except the receipt */}
        <style>{`
          @media print {
            body > *:not(.print-receipt) { display: none !important; }
            .print-receipt { display: block !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="print-receipt bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{typeLabel}</h2>
                <p className="text-teal-100 text-sm mt-0.5">{institutionName}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold bg-teal-800/50 px-3 py-1 rounded">
                  {payment.receiptNo || payment.paymentNo}
                </p>
                <p className="text-teal-200 text-xs mt-1">{payDate}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-3">
            {studentName && txType === "FEE" && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground font-medium">Student</span>
                <span className="font-semibold">{studentName}</span>
              </div>
            )}
            {txType === "DONATION" && payment.remarks && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground font-medium">Donor / Notes</span>
                <span className="font-semibold text-right max-w-[220px]">{payment.remarks}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground font-medium">
                {txType === "EXPENSE" ? "Description" : "Fee / Purpose"}
              </span>
              <span className="font-semibold text-right max-w-[220px]">
                {payment.remarks || (payment as any).feeName || payment.feeCategoryId}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground font-medium">Payment Method</span>
              <span className="font-semibold">{payment.paymentMethod?.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground font-medium">Status</span>
              <span
                className={`font-bold text-sm px-2 py-0.5 rounded-full ${
                  payment.status === "VOID" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}
              >
                {payment.status}
              </span>
            </div>

            {/* Amount */}
            <div className="mt-4 bg-muted/50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Amount</span>
              <span className="text-3xl font-bold text-teal-700 dark:text-teal-400">
                Rs.{payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              This is a computer-generated receipt. No signature required.
            </p>
          </div>

          {/* Footer */}
          <div className="no-print flex gap-2 px-6 pb-6 justify-end">
            <Button variant="outline" onClick={onClose} size="sm">
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
            <Button variant="outline" onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={handleDownloadPdf} size="sm" className="bg-teal-700 hover:bg-teal-800 text-white">
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
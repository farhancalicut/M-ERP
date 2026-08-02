"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PromotionPayload, promotionService } from "../services/promotionService";
import { toast } from "sonner";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface PromotionConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  payload: PromotionPayload | null;
  onSuccess?: () => void;
}

export function PromotionConfirmationDialog({ isOpen, onOpenChange, payload, onSuccess }: PromotionConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ name: string, userId: string, password?: string }[]>([]);
  const router = useRouter();
  const [copied, setCopied] = useState<number | null>(null);

  if (!payload) return null;

  const summary = promotionService.calculatePromotionSummary(payload.students);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const res = await promotionService.promoteStudents(payload);
      if (res.newCredentials.length > 0) {
        setCredentials(res.newCredentials);
      } else {
        toast.success("All students have been processed.");
        onSuccess?.();
        onOpenChange(false);
        router.push("/promotion/history");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion Failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (credentials.length > 0) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {
        onSuccess?.();
        onOpenChange(false);
        router.push("/promotion/history");
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Promotion Successful</DialogTitle>
            <DialogDescription>
              Alumni accounts have been created. Please securely share these temporary credentials with the alumni.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-4">
            {credentials.map((cred, idx) => (
              <div key={idx} className="p-4 border rounded-md flex items-center justify-between bg-muted/30">
                <div>
                  <p className="font-medium">{cred.name}</p>
                  <p className="text-sm text-muted-foreground">User ID: <span className="font-mono text-foreground">{cred.userId}</span></p>
                  {cred.password && (
                    <p className="text-sm text-muted-foreground">Password: <span className="font-mono text-foreground">{cred.password}</span></p>
                  )}
                </div>
                {cred.password && (
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(idx, `ID: ${cred.userId} \nPassword: ${cred.password}`)}>
                    {copied === idx ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              onSuccess?.();
              onOpenChange(false);
              router.push("/promotion/history");
            }}>Close & Finish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Promotion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-4">
          <div className="bg-destructive/15 text-destructive p-4 rounded-md flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              Are you sure you want to finalize this promotion? This action will update class strengths, student records, and generate alumni accounts. 
              <br /><strong> You can rollback this action later if the next academic year hasn&apos;t started and no marks/attendance have been recorded.</strong>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-xl font-bold">{summary.totalStudents}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">Promoting</p>
              <p className="text-xl font-bold text-green-600">{summary.promotedCount}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">Detaining</p>
              <p className="text-xl font-bold text-red-600">{summary.detainedCount}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">To Alumni</p>
              <p className="text-xl font-bold text-blue-600">{summary.alumniCount}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm & Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

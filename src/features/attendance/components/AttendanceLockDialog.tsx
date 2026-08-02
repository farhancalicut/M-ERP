import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LockIcon, UnlockIcon } from "lucide-react";

interface AttendanceLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLocked: boolean;
  date: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function AttendanceLockDialog({
  open,
  onOpenChange,
  isLocked,
  date,
  onConfirm,
  isLoading,
}: AttendanceLockDialogProps) {
  const isLocking = !isLocked;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLocking ? (
              <LockIcon className="w-5 h-5 text-red-600" />
            ) : (
              <UnlockIcon className="w-5 h-5 text-green-600" />
            )}
            {isLocking ? "Lock Attendance" : "Unlock Attendance"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLocking
              ? `Are you sure you want to lock the attendance for ${date}? Teachers will no longer be able to make any changes.`
              : `Are you sure you want to unlock the attendance for ${date}? Teachers will be able to edit this record if it falls within their allowed time window.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={isLocking ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {isLoading ? "Processing..." : isLocking ? "Yes, Lock It" : "Yes, Unlock It"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

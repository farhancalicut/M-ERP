import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AdmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  credentials?: {
    email?: string;
    password: string;
  } | null;
}

export function AdmissionSuccessModal({ isOpen, onClose, studentName, credentials }: AdmissionSuccessModalProps) {
  const handleCopy = () => {
    if (credentials) {
      navigator.clipboard.writeText(`Email/Mobile: ${credentials.email || 'N/A'}\nPassword: ${credentials.password}`);
      alert("Credentials copied to clipboard");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Student Admitted Successfully</DialogTitle>
          <DialogDescription>
            {studentName} has been admitted.
          </DialogDescription>
        </DialogHeader>
        
        {credentials && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md space-y-2 text-sm font-mono">
              <p>Email: {credentials.email}</p>
              <p>Password: {credentials.password}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Please save these credentials now. They will not be shown again.
            </p>
          </div>
        )}

        <DialogFooter className="flex space-x-2 justify-end">
          {credentials && (
            <>
              <Button variant="outline" onClick={handleCopy}>
                Copy
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                Print
              </Button>
            </>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings, Upload } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { donationSettingsService } from "@/features/finance/services/donationSettingsService";
// Note: In a real app with Firebase Storage, we would upload the file.
// Since Storage rules might not be configured, we will accept an Image URL for now,
// or simulate an upload by converting a small image to base64.

export function DonationSettingsDialog() {
  const { userData } = useAuthStore();
  const madrassaId = userData?.madrassaId;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("Support Our Madrassa");
  const [description, setDescription] = useState("Your contributions help us nurture the next generation.");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (open && madrassaId) {
      loadSettings();
    }
  }, [open, madrassaId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await donationSettingsService.getSettings(madrassaId!);
      if (settings) {
        setTitle(settings.title);
        setDescription(settings.description);
        setQrCodeUrl(settings.qrCodeUrl || "");
      }
    } catch (err) {
      toast.error("Failed to load donation settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!madrassaId || !userData?.uid) return;
    try {
      setSaving(true);
      await donationSettingsService.updateSettings(
        madrassaId,
        { title, description, qrCodeUrl },
        userData.uid
      );
      toast.success("Donation settings updated successfully!");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      toast.error("File is too large. Max 2MB.");
      return;
    }
    // Simulate upload by converting to base64 to bypass storage setup issues
    const reader = new FileReader();
    reader.onload = () => {
      setQrCodeUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Donation Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custom Donation Card</DialogTitle>
          <DialogDescription>
            Configure the motivating message and QR code shown to Alumni on the donations page.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Card Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Support Our Cause"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Motivating Message</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Write a message to inspire donations..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment QR Code Image</Label>
              <div className="flex items-center gap-4">
                {qrCodeUrl ? (
                   <img src={qrCodeUrl} alt="QR Code" className="h-20 w-20 object-cover border rounded-md" />
                ) : (
                   <div className="h-20 w-20 bg-slate-100 border-2 border-dashed rounded-md flex items-center justify-center">
                     <Upload className="h-6 w-6 text-slate-400" />
                   </div>
                )}
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  <p className="text-xs text-muted-foreground mt-1">Upload a small QR code image.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

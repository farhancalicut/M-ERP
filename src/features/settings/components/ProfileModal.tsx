"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { UserCircle, KeyRound } from "lucide-react";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
        <div className="bg-white dark:bg-slate-950 rounded-xl overflow-hidden border shadow-xl">
          <Tabs defaultValue="profile" className="w-full">
            <div className="bg-slate-50 dark:bg-slate-900 border-b px-4 py-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="gap-2">
                  <UserCircle className="w-4 h-4" />
                  Profile Details
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-2">
                  <KeyRound className="w-4 h-4" />
                  Security
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <TabsContent value="profile" className="mt-0 outline-none">
                <ProfileForm onSuccess={() => onOpenChange(false)} />
              </TabsContent>
              
              <TabsContent value="password" className="mt-0 outline-none">
                <PasswordForm />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

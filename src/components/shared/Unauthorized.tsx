"use client";

import { AlertOctagon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export function Unauthorized() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertOctagon className="w-10 h-10 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold tracking-tight">Unauthorized</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          You must be logged in to view this page.
        </p>
      </div>
      <Button onClick={() => router.push("/login")}>Go to Login</Button>
    </div>
  );
}

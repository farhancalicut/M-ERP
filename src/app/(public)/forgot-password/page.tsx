"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Password reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground font-medium">
            To reset your password, please contact your Madrassa Administrator or Principal.
          </p>
          <p className="text-sm text-muted-foreground">
            They will generate a new temporary password for your account, which you can use to activate your account again.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Return to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

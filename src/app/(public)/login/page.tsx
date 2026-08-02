"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authService } from "@/features/auth/services/authService";
import { AppError } from "@/lib/errors/AppError";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const activationSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function LoginPage() {
  const [error, setError] = useState("");
  const [activationData, setActivationData] = useState<{ email: string; tempPassword: string } | null>(null);
  const [activationError, setActivationError] = useState("");
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const activationForm = useForm<z.infer<typeof activationSchema>>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError("");
    try {
      await authService.login(values);
      // AuthProvider handles redirect automatically when state updates
    } catch (err: any) {
      if (err.code === 'auth/requires-new-password') {
        setActivationData({ email: err.email, tempPassword: err.temporaryPassword });
        return;
      }
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError("Invalid credentials or account inactive.");
      }
    }
  }

  async function onActivationSubmit(values: z.infer<typeof activationSchema>) {
    if (!activationData) return;
    setActivationError("");
    
    try {
      await authService.firstLogin({
        email: activationData.email,
        temporaryPassword: activationData.tempPassword,
        newPassword: values.newPassword
      });
      // AuthProvider will automatically redirect to dashboard on successful login
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setActivationError(err.message);
      } else {
        setActivationError("Failed to activate account. Please try again.");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access the M-ERP dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <div className="text-sm font-medium text-destructive mt-2 p-2 bg-destructive/10 rounded-md text-center">
                  {error}
                </div>
              )}
              
              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-sm text-center">
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">
            Forgot password?
          </Link>
        </CardFooter>
      </Card>

      <Dialog open={!!activationData} onOpenChange={(open) => !open && setActivationData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Your Account</DialogTitle>
            <DialogDescription>
              You have logged in with a temporary password. Please set a new permanent password to activate your account.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...activationForm}>
            <form onSubmit={activationForm.handleSubmit(onActivationSubmit)} className="space-y-4">
              <FormField
                control={activationForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={activationForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {activationError && (
                <div className="text-sm font-medium text-destructive mt-2 p-2 bg-destructive/10 rounded-md text-center">
                  {activationError}
                </div>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setActivationData(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={activationForm.formState.isSubmitting}>
                  {activationForm.formState.isSubmitting ? "Activating..." : "Set Password & Login"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

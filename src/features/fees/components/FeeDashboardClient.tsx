"use client";

import { useState, useEffect } from "react";
import { FeePayment, Class } from "@/types/schema";
import { paymentService } from "@/features/fees/services/paymentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import { Loader2, CheckIcon, XIcon, IndianRupeeIcon, ClockIcon, AlertTriangleIcon, HeartIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { classService } from "@/features/academic/services/classService";

export function FeeDashboardClient() {
  const [pendingPayments, setPendingPayments] = useState<FeePayment[]>([]);
  const [recentPayments, setRecentPayments] = useState<FeePayment[]>([]);
  const [stats, setStats] = useState({ todayCollection: 0, monthCollection: 0, pendingCount: 0 });
  const [analytics, setAnalytics] = useState<{
    defaulters: any[];
    totalWaivers: number;
    collectionTrends: any[];
  } | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const [loadingPaymentId, setLoadingPaymentId] = useState<string | null>(null);
  const { user, userData } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.madrassaId) return;
      try {
        setIsLoading(true);
        const [statsData, pendingData, recentData, classesResponse] = await Promise.all([
          paymentService.getPaymentStats(userData.madrassaId),
          paymentService.getPendingPayments(userData.madrassaId),
          paymentService.getPayments(userData.madrassaId, {}, 10),
          classService.getClasses(userData.madrassaId, "ACTIVE", undefined, 100)
        ]);
        setStats(statsData);
        setPendingPayments(pendingData);
        setRecentPayments(recentData.payments);
        setClasses(classesResponse.classes);
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userData?.madrassaId]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const madrassaId = userData?.madrassaId;
      const academicYearId = (userData as any)?.madrassa?.currentAcademicYear;
      if (!madrassaId || !academicYearId) return;
      try {
        const data = await paymentService.getDashboardAnalytics(madrassaId, academicYearId, selectedClass);
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      }
    };
    fetchAnalytics();
  }, [userData?.madrassaId, selectedClass]);

  const handleVerify = async (paymentId: string, action: "APPROVE" | "REJECT") => {
    if (!user) return;
    try {
      setLoadingPaymentId(paymentId);
      await paymentService.verifyPayment(paymentId, action, user.uid);
      toast.success(`Payment ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      
      // Remove from pending list
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
      router.refresh(); // Refresh stats and recent payments
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    } finally {
      setLoadingPaymentId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-4">
        <Label>Filter Analytics:</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes (Madrassa)</SelectItem>
            {classes.map(c => (
              <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Needs approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected Today</CardTitle>
            <IndianRupeeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.todayCollection}</div>
            <p className="text-xs text-muted-foreground">Madrassa total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
            <IndianRupeeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{stats.monthCollection}</div>
            <p className="text-xs text-muted-foreground">Madrassa total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waivers</CardTitle>
            <HeartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{analytics?.totalWaivers || 0}</div>
            <p className="text-xs text-muted-foreground">For selected filter</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collection Trends</CardTitle>
            <CardDescription>Last 6 months collection</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {analytics?.collectionTrends ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.collectionTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value}`, "Collected"]}
                      cursor={{ fill: 'transparent' }} 
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Defaulters</CardTitle>
            <CardDescription>Highest pending dues</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.defaulters && analytics.defaulters.length > 0 ? (
              <div className="space-y-4">
                {analytics.defaulters.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{d.studentName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Class ID: {d.className}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600 flex items-center">
                        <AlertTriangleIcon className="h-4 w-4 mr-1" />
                        ₹{d.dueAmount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {analytics ? "No defaulters found" : <Loader2 className="animate-spin h-6 w-6" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Cash Verifications</CardTitle>
          <CardDescription>Review and approve cash collected by teachers.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-md">
              No pending verifications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Collected By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.paymentNo}</TableCell>
                    <TableCell>{format(payment.paymentDate.toDate(), "dd MMM yyyy")}</TableCell>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{payment.collectedBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          disabled={loadingPaymentId === payment.id}
                          onClick={() => handleVerify(payment.id as string, "APPROVE")}
                        >
                          {loadingPaymentId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4 mr-1" />}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          disabled={loadingPaymentId === payment.id}
                          onClick={() => handleVerify(payment.id as string, "REJECT")}
                        >
                          {loadingPaymentId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XIcon className="h-4 w-4 mr-1" />}
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Verified Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-md">
              No recent collections.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.paymentNo}</TableCell>
                    <TableCell>{format(payment.paymentDate.toDate(), "dd MMM yyyy")}</TableCell>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

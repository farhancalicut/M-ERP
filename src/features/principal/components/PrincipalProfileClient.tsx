"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { leaveService } from "@/features/leave/services/leaveService";
import { salaryService } from "@/features/finance/services/salaryService";
import { LeaveRequest, SalaryStructure, SalaryPayment } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/features/settings/components/ProfileModal";
import { format } from "date-fns";
import { 
  UserCircle, 
  CalendarDays, 
  Wallet, 
  Mail, 
  Phone, 
  Briefcase, 
  Award, 
  MapPin, 
  Droplet,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  FileText,
  Calendar,
  Edit3
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PrincipalProfileClient() {
  const { userData, madrassa } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructure | null>(null);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.id || !madrassa?.id) return;
      
      try {
        setLoading(true);
        // Fetch leaves
        const leavesRes = await leaveService.getLeaveRequests(madrassa.id, {
          type: "STAFF",
          requesterId: userData.id
        }, 50);
        setLeaves(leavesRes.requests);

        // Fetch salary structure
        const structure = await salaryService.getSalaryStructure(userData.id);
        setSalaryStructure(structure);

        // Fetch salary payments
        const payments = await salaryService.getSalaryPayments(madrassa.id, { userId: userData.id });
        setSalaryPayments(payments);
      } catch (error) {
        console.error("Error fetching principal profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData?.id, madrassa?.id]);

  if (!userData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const getLeaveStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "REJECTED": return <XCircle className="w-4 h-4 text-rose-500" />;
      case "PENDING": return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLeaveStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900";
      case "REJECTED": return "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900";
      case "PENDING": return "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Profile Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm border">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-teal-500 to-emerald-600 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Decorative shapes */}
          <div className="absolute right-0 bottom-0 opacity-20">
            <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="150" cy="150" r="100" fill="white" />
              <circle cx="50" cy="50" r="30" fill="white" />
            </svg>
          </div>
        </div>
        
        <div className="px-6 sm:px-10 pb-6">
          <div className="relative flex flex-col sm:flex-row gap-6 sm:items-end -mt-16 sm:-mt-20 mb-4">
            <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white dark:border-slate-900 shadow-xl bg-white">
              <AvatarImage src={userData.photoUrl} alt={userData.displayName} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-700">
                {userData.displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1 sm:pb-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {userData.displayName}
                  </h1>
                  <Badge className="w-fit bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200 dark:bg-teal-900/50 dark:text-teal-300">
                    {userData.role.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm sm:text-base mt-1">
                  <Briefcase className="w-4 h-4" /> 
                  {userData.qualification ? userData.qualification : "Principal"} at {madrassa?.name}
                </p>
              </div>
              <Button onClick={() => setIsEditModalOpen(true)} variant="outline" className="shrink-0 gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none pb-3 px-1"
          >
            <UserCircle className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="leaves"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none pb-3 px-1"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Leave Records
          </TabsTrigger>
          <TabsTrigger 
            value="salary"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none pb-3 px-1"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Salary & Payroll
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <UserCircle className="w-5 h-5 text-teal-600" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </p>
                      <p className="font-medium text-sm truncate">{userData.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Mobile Number
                      </p>
                      <p className="font-medium text-sm">{userData.contactNumber || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-red-500" /> Blood Group
                      </p>
                      <p className="font-medium text-sm">{userData.bloodGroup || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Address
                      </p>
                      <p className="font-medium text-sm">{userData.address || "Not provided"}</p>
                    </div>
                    {userData.identityMarks && (
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Identity Marks</p>
                        <p className="font-medium text-sm">{userData.identityMarks}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Award className="w-5 h-5 text-teal-600" />
                    Professional Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="font-medium text-sm">{userData.role}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Joining Date
                      </p>
                      <p className="font-medium text-sm">
                        {userData.joiningDate ? format(userData.joiningDate.toDate(), "dd MMM yyyy") : "Not provided"}
                      </p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Highest Qualification</p>
                      <p className="font-medium text-sm">{userData.qualification || "Not provided"}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Specialization</p>
                      <p className="font-medium text-sm">{userData.specialization || "Not provided"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LEAVES TAB */}
          <TabsContent value="leaves" className="focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Leave History</CardTitle>
                  <CardDescription>Your recent leave applications and their statuses.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : leaves.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No leave records found.</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Applied On</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaves.map((leave) => (
                          <TableRow key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                            <TableCell className="font-medium">{leave.leaveType.replace(/_/g, ' ')}</TableCell>
                            <TableCell className="text-sm">
                              <div className="flex flex-col">
                                <span>{format(leave.fromDate.toDate(), "dd MMM yy")}</span>
                                <span className="text-xs text-muted-foreground">to {format(leave.toDate.toDate(), "dd MMM yy")}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm" title={leave.reason}>
                              {leave.reason}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {leave.createdAt ? format(leave.createdAt.toDate(), "dd MMM yy") : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={`gap-1 pr-2.5 font-medium ${getLeaveStatusColor(leave.status)}`}>
                                {getLeaveStatusIcon(leave.status)}
                                {leave.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SALARY TAB */}
          <TabsContent value="salary" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Salary Structure */}
              <Card className="border-slate-200 shadow-sm md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-teal-600" />
                    Salary Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : salaryStructure ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900">
                        <p className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-1">Net Monthly Salary</p>
                        <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">
                          ₹{salaryStructure.netSalary.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Basic Pay</span>
                          <span className="font-medium">₹{salaryStructure.baseSalary.toLocaleString()}</span>
                        </div>
                        
                        {salaryStructure.defaultAllowances.length > 0 && (
                          <div className="pt-2 border-t border-dashed">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Allowances</p>
                            {salaryStructure.defaultAllowances.map((allowance, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm mb-1">
                                <span className="text-emerald-600 dark:text-emerald-400">{allowance.name}</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">+₹{allowance.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {salaryStructure.defaultDeductions.length > 0 && (
                          <div className="pt-2 border-t border-dashed">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Deductions</p>
                            {salaryStructure.defaultDeductions.map((deduction, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm mb-1">
                                <span className="text-rose-600 dark:text-rose-400">{deduction.name}</span>
                                <span className="font-medium text-rose-600 dark:text-rose-400">-₹{deduction.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Salary structure not configured.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="border-slate-200 shadow-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <CardDescription>Your recent salary deposits.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : salaryPayments.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No salary payments found.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                          <TableRow>
                            <TableHead>Month/Year</TableHead>
                            <TableHead>Date Paid</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Net Paid</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salaryPayments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                              <TableCell className="font-medium">
                                {format(new Date(payment.year, payment.month - 1), "MMMM yyyy")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {format((payment.paymentDate as any).toDate(), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {payment.paymentMethod}
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                                ₹{payment.netPaid.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={payment.status === "PAID" ? "default" : "destructive"} 
                                  className={payment.status === "PAID" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                  {payment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      <ProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
    </div>
  );
}

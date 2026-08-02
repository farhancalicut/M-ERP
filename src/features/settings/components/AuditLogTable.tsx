"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { auditLogService } from "../services/auditLogService";
import { AuditLog, AuditLogAction, AuditLogModule } from "@/types/schema";
import { useAuthStore } from "@/stores/authStore";
import { DocumentData } from "firebase/firestore";

const MODULES: AuditLogModule[] = [
  'Students', 'Parents', 'Attendance', 'Examinations', 'Results', 
  'Promotions', 'Fees', 'Settings', 'Notifications', 'Users'
];

const ACTIONS: AuditLogAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'LOGIN', 'LOGOUT', 
  'PUBLISH', 'LOCK', 'UNLOCK', 'PROMOTE', 'PAYMENT', 'RESULT_PUBLISH'
];

export function AuditLogTable() {
  const { userData } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDocs, setLastDocs] = useState<(DocumentData | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUser, setFilterUser] = useState("");

  const loadLogs = async (page: number, reset: boolean = false) => {
    if (!userData?.madrassaId) return;
    
    setLoading(true);
    try {
      const currentLastDoc = reset ? null : lastDocs[page];
      
      const filters: any = {};
      if (filterModule !== "all") filters.module = filterModule;
      if (filterAction !== "all") filters.action = filterAction;
      if (filterUser) filters.user = filterUser;

      const { logs: newLogs, lastDoc } = await auditLogService.getLogs(
        userData.madrassaId, 
        15, 
        currentLastDoc || undefined,
        filters
      );

      setLogs(newLogs);

      if (reset) {
        setLastDocs([null, lastDoc]);
        setCurrentPage(0);
      } else {
        const nextLastDocs = [...lastDocs];
        nextLastDocs[page + 1] = lastDoc;
        setLastDocs(nextLastDocs);
        setCurrentPage(page);
      }
    } catch (error: any) {
      console.error("Audit Logs Error:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.madrassaId) {
      loadLogs(0, true);
    }
  }, [userData?.madrassaId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(0, true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Audit Logs</CardTitle>
        <CardDescription>Track critical actions and changes across the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-1 w-full md:w-1/4">
            <Label>Module</Label>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 w-full md:w-1/4">
            <Label>Action</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 w-full md:w-1/4">
            <Label>User Name</Label>
            <Input 
              placeholder="Filter by User Name..." 
              value={filterUser} 
              onChange={e => setFilterUser(e.target.value)} 
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Filter
          </Button>
        </form>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Document ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {log.createdAt ? format(log.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                        {log.role}
                      </span>
                    </TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[150px]" title={log.documentId}>
                      {log.documentId}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs(currentPage - 1)}
            disabled={currentPage === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs(currentPage + 1)}
            disabled={!lastDocs[currentPage + 1] || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

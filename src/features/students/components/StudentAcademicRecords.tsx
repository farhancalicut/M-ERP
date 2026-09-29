import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Attendance, Result, Promotion, PromotionStudent } from "@/types/schema";
import { format } from "date-fns";
import { classService } from "@/features/academic/services/classService";
import { examService } from "@/features/exams/services/examService";

export function StudentAcademicRecords({ 
  studentId, 
  madrassaId, 
  academicYearId, 
  currentClassId 
}: { 
  studentId: string, 
  madrassaId: string, 
  academicYearId: string, 
  currentClassId: string 
}) {
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; absent: number; leave: number; total: number; percentage: number } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [promotions, setPromotions] = useState<{ promotion: Promotion; record: PromotionStudent }[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [examNames, setExamNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!madrassaId || !studentId) return;

    const loadAcademicData = async () => {
      setLoading(true);
      try {
        // 0. Load Classes and Exams mappings
        const classRes = await classService.getClasses(madrassaId, "ALL");
        const cMap: Record<string, string> = {};
        classRes.classes.forEach(c => { if (c.id) cMap[c.id] = c.name; });
        setClassNames(cMap);

        const examRes = await examService.getExams(madrassaId, academicYearId || "ALL", "ALL", undefined, 100);
        const eMap: Record<string, string> = {};
        examRes.exams.forEach(e => { if (e.id) eMap[e.id] = e.name; });
        setExamNames(eMap);

        // 1. Fetch Attendance (Current Year, Current Class)
        if (academicYearId && currentClassId) {
          const attQ = query(
            collection(db, "attendance"),
            where("madrassaId", "==", madrassaId),
            where("academicYearId", "==", academicYearId),
            where("classId", "==", currentClassId)
          );
          const attSnap = await getDocs(attQ);
          let present = 0, absent = 0, leave = 0, total = 0;
          
          attSnap.forEach(doc => {
            const data = doc.data() as Attendance;
            const studentRecord = data.attendance[studentId];
            if (studentRecord) {
              total++;
              if (studentRecord.status === "PRESENT") present++;
              else if (studentRecord.status === "ABSENT") absent++;
              else if (studentRecord.status === "LEAVE") leave++;
            }
          });
          
          if (total > 0) {
            setAttendanceStats({ present, absent, leave, total, percentage: Math.round((present / total) * 100) });
          } else {
            setAttendanceStats({ present: 0, absent: 0, leave: 0, total: 0, percentage: 0 });
          }
        }

        // 2. Fetch Results (Current Year)
        if (academicYearId) {
          const resQ = query(
            collection(db, "results"),
            where("madrassaId", "==", madrassaId),
            where("academicYearId", "==", academicYearId)
          );
          const resSnap = await getDocs(resQ);
          const studentResults: Result[] = [];
          resSnap.forEach(doc => {
            const data = doc.data() as Result;
            if (data.students && data.students[studentId]) {
              studentResults.push(data);
            }
          });
          setResults(studentResults);
        }

        // 3. Fetch Promotions History (All Years)
        const promoQ = query(
          collection(db, "promotions"),
          where("madrassaId", "==", madrassaId)
        );
        const promoSnap = await getDocs(promoQ);
        const studentPromos: { promotion: Promotion; record: PromotionStudent }[] = [];
        
        promoSnap.forEach(doc => {
          const data = doc.data() as Promotion;
          const studentRecord = data.students.find(s => s.studentId === studentId);
          if (studentRecord) {
            studentPromos.push({ promotion: data, record: studentRecord });
          }
        });
        
        // Sort promotions descending by processedAt
        studentPromos.sort((a, b) => (b.promotion.processedAt?.toMillis() || 0) - (a.promotion.processedAt?.toMillis() || 0));
        setPromotions(studentPromos);

      } catch (error) {
        console.error("Error fetching academic records:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAcademicData();
  }, [madrassaId, studentId, academicYearId, currentClassId]);

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading academic details...</div>;
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className="text-xl font-bold">Academic Records</h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Attendance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance (Current Year)</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceStats && attendanceStats.total > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Attendance %</span>
                  <span className={`text-2xl font-bold ${attendanceStats.percentage < 75 ? 'text-red-500' : 'text-green-600'}`}>
                    {attendanceStats.percentage}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm pt-4 border-t">
                  <div>
                    <div className="font-bold text-green-600">{attendanceStats.present}</div>
                    <div className="text-muted-foreground text-xs uppercase">Present</div>
                  </div>
                  <div>
                    <div className="font-bold text-red-500">{attendanceStats.absent}</div>
                    <div className="text-muted-foreground text-xs uppercase">Absent</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-500">{attendanceStats.leave}</div>
                    <div className="text-muted-foreground text-xs uppercase">Leave</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No attendance records found for this year.</div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Exam Results (Current Year)</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map(res => {
                  const sRes = res.students[studentId];
                  if (!sRes) return null;
                  return (
                    <div key={res.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card shadow-sm gap-2">
                      <div>
                        <div className="font-medium">{examNames[res.examId] || res.examId}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Class {classNames[res.classId] || res.classId} • {sRes.obtainedMarks} / {sRes.totalMarks} Marks ({sRes.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <Badge variant={sRes.resultStatus === "PASS" ? "default" : "destructive"}>
                        {sRes.resultStatus}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No exam results found for this year.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotion History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Promotion History</CardTitle>
        </CardHeader>
        <CardContent>
          {promotions.length > 0 ? (
            <div className="space-y-4">
              {promotions.map((p, idx) => (
                <div key={p.promotion.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card shadow-sm gap-4">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span>Date: {p.promotion.processedAt ? format(p.promotion.processedAt.toDate(), "dd MMM yyyy") : "N/A"}</span>
                      {p.promotion.status === "ROLLED_BACK" && <Badge variant="destructive" className="text-[10px]">Rolled Back</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      From Class: <span className="font-medium text-foreground">{classNames[p.record.previousClassId || ""] || p.record.previousClassId || "Unknown"}</span>
                      {p.record.action === "PROMOTED" && p.promotion.toClassId && (
                        <>
                          <span className="mx-2">→</span>
                          To Class: <span className="font-medium text-foreground">{classNames[p.promotion.toClassId] || p.promotion.toClassId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.record.resultStatus === "PASS" ? "secondary" : p.record.resultStatus === "NO_RESULT" ? "outline" : "destructive"}>
                      Result: {p.record.resultStatus}
                    </Badge>
                    <Badge variant={p.record.action === "PROMOTED" ? "default" : p.record.action === "ALUMNI" ? "outline" : "destructive"}>
                      {p.record.action}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No promotion history found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

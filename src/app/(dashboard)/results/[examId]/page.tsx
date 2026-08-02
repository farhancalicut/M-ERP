"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exam, Class } from "@/types/schema";
import { examService } from "@/features/exams/services/examService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function ResultsClassSelectorPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.role === "TEACHER") {
      router.push("/teacher");
      return;
    }
  }, [userData, router]);

  useEffect(() => {
    if (!userData?.madrassaId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const examDoc = await examService.getExam(params.examId);
        if (!examDoc || examDoc.madrassaId !== userData.madrassaId) {
          toast.error("Exam not found");
          router.push("/results");
          return;
        }

        const cls = await examService.getExamClasses(userData.madrassaId, examDoc);
        setExam(examDoc);
        setClasses(cls);
      } catch (error: unknown) {
        toast.error("Failed to load exam classes");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userData?.role !== "TEACHER") {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.madrassaId, params.examId, userData?.role]);

  if (userData?.role === "TEACHER") return null;

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading classes...</div>;
  }

  if (!exam) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/results")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Select Class</h1>
          <p className="text-muted-foreground">{exam.name} - Results Generation</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-12 text-center text-muted-foreground">
          No applicable classes found for this exam.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {classes.map(cls => (
            <Card key={cls.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center justify-between">
                  {cls.name}
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Capacity: {cls.capacity} | Current: {cls.currentStrength}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Link href={`/results/${exam.id}/${cls.id}`} className="w-full">
                  <Button className="w-full" variant="outline">
                    View Results
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exam, Class } from "@/types/schema";
import { examService } from "@/features/exams/services/examService";
import { resultService } from "@/features/exams/services/resultService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function ResultsClassSelectorPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    // Teachers are now allowed to view results
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

  const handlePublishAll = async () => {
    if (!confirm("Are you sure you want to publish results for ALL classes? Parents will be able to see them immediately.\n\nNote: Only classes with previously generated results will be published.")) return;
    
    setPublishing(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const cls of classes) {
      try {
        await resultService.publishResults(exam!.id!, cls.id!, userData!.uid);
        successCount++;
      } catch (err: any) {
        if (err?.message?.includes("Generate results first")) {
          // Skip classes where results haven't been generated yet
        } else {
          failCount++;
        }
      }
    }
    
    setPublishing(false);
    if (successCount > 0) {
      toast.success(`Successfully published results for ${successCount} classes.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to publish results for ${failCount} classes.`);
    }
    if (successCount === 0 && failCount === 0) {
      toast.info("No generated results found to publish. Please generate results first.");
    }
  };

  if (!exam) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/results")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Select Class</h1>
            <p className="text-muted-foreground">{exam.name} - Results Generation</p>
          </div>
        </div>
        {classes.length > 0 && (
          <Button onClick={handlePublishAll} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish All Results"}
          </Button>
        )}
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

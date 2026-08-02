"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studyMaterialService } from "@/features/academic/services/studyMaterialService";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilePreview } from "@/components/shared/FilePreview";

export default function ParentStudyMaterialDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuthStore();
  
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((userData as any)?.madrassaId) {
      studyMaterialService.getMaterial(params.id).then(matRes => {
        if (!matRes || matRes.madrassaId !== (userData as any).madrassaId) {
          router.push("/parent/study-materials");
        } else {
          setMaterial(matRes);
        }
        setLoading(false);
      });
    }
  }, [params.id, userData, router]);

  if (loading) return <div>Loading...</div>;
  if (!material) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent/study-materials">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{material.title}</h1>
          <p className="text-muted-foreground">
            Study Material & Resources
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Description</h3>
        <p className="whitespace-pre-wrap text-sm">{material.description}</p>
        
        {material.files && material.files.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Files & Resources</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {material.files.map((att: any, i: number) => (
                <FilePreview key={i} attachment={att} showDownload={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

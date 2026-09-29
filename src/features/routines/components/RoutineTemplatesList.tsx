"use client";

import { useState, useEffect } from "react";
import { RoutineTemplate } from "@/types/schema";
import { routineService } from "@/features/routines/services/routineService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { classService } from "@/features/academic/services/classService";

export function RoutineTemplatesList() {
  const { userData } = useAuthStore();
  const router = useRouter();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userData?.madrassaId) return;
    const loadData = async () => {
      try {
        const [tpls, cls] = await Promise.all([
          routineService.getTemplates(userData.madrassaId),
          classService.getClasses(userData.madrassaId, "ALL")
        ]);
        setTemplates(tpls);
        
        const map: Record<string, string> = {};
        cls.classes.forEach(c => map[c.id!] = c.name);
        setClassNames(map);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userData?.madrassaId]);

  const handleToggleStatus = async (template: RoutineTemplate) => {
    if (!userData?.uid) return;
    try {
      await routineService.updateTemplate(template.id!, { isActive: !template.isActive }, userData.uid);
      setTemplates(templates.map(t => t.id === template.id ? { ...t, isActive: !t.isActive } : t));
      toast.success(`Template ${template.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await routineService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success("Template deleted successfully");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Routine Templates</h3>
        <Button onClick={() => router.push("/routines/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <div key={template.id} className="border rounded-lg p-5 bg-card flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{template.name}</h4>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {template.description && <p className="text-sm text-muted-foreground mb-4">{template.description}</p>}
              
              <div className="text-sm mb-2">
                <span className="font-medium">Assigned Classes:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.classIds.length > 0 ? template.classIds.map(cid => (
                    <Badge key={cid} variant="outline">{classNames[cid] || cid}</Badge>
                  )) : <span className="text-muted-foreground">None</span>}
                </div>
              </div>
              
              <div className="text-sm mb-4">
                <span className="font-medium">Tasks:</span> {template.tasks.length}
                <div className="text-muted-foreground text-xs mt-1">
                  Cutoff: {template.cutoffTime || "23:59"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(template)}>
                {template.isActive ? <XCircle className="h-4 w-4 mr-1 text-red-500" /> : <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />}
                {template.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => router.push(`/routines/${template.id}/edit`)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(template.id!)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">Create your first daily routine template to get started.</p>
            <Button onClick={() => router.push("/routines/new")}>
              <Plus className="h-4 w-4 mr-2" /> Create Template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

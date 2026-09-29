"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studyMaterialFormSchema, StudyMaterialFormValues } from "../schemas/academicSchemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FileUpload, AttachmentData } from "@/components/shared/FileUpload";
import { FilePreview } from "@/components/shared/FilePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudyMaterialFormProps {
  initialData?: any; 
  onSubmit: (data: StudyMaterialFormValues) => Promise<void>;
  isLoading: boolean;
  classes: any[];
  subjects: any[];
}

export function StudyMaterialForm({ initialData, onSubmit, isLoading, classes, subjects }: StudyMaterialFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(studyMaterialFormSchema),
    defaultValues: {
      classId: initialData?.classId || "",
      subjectId: initialData?.subjectId || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      files: initialData?.files || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "files",
  });

  const handleUpload = (attachment: AttachmentData) => {
    if (fields.length >= 10) {
      form.setError("files", { message: "Maximum 10 files allowed" });
      return;
    }
    form.clearErrors("files");
    append(attachment);
  };

  const watchClassId = form.watch("classId");
  const availableSubjects = subjects.filter(s => !s.classIds || s.classIds.includes(watchClassId));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="classId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || !watchClassId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Chapter 1 Notes" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Material details..." className="min-h-[120px]" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 border rounded-md p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Files (Required, Max 10)</label>
            <FileUpload onUpload={handleUpload} maxSizeMB={10} label="Upload File" />
          </div>
          {form.formState.errors.files && (
            <p className="text-sm text-destructive">{form.formState.errors.files.message as string}</p>
          )}
          
          {fields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {fields.map((field, index) => (
                <FilePreview 
                  key={field.id} 
                  attachment={field as any} 
                  onRemove={() => remove(index)} 
                  showDownload={false} 
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No files uploaded yet.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <span>{initialData ? "Update Material" : "Publish Material"}</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}

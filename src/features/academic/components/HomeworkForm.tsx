"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { homeworkFormSchema, HomeworkFormValues } from "../schemas/academicSchemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FileUpload, AttachmentData } from "@/components/shared/FileUpload";
import { FilePreview } from "@/components/shared/FilePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface HomeworkFormProps {
  initialData?: any; // To allow edits
  onSubmit: (data: HomeworkFormValues) => Promise<void>;
  isLoading: boolean;
  classes: any[];
  subjects: any[];
}

export function HomeworkForm({ initialData, onSubmit, isLoading, classes, subjects }: HomeworkFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(homeworkFormSchema),
    defaultValues: {
      classId: initialData?.classId || "",
      subjectId: initialData?.subjectId || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      attachments: initialData?.attachments || [],
      assignedDate: initialData?.assignedDate ? initialData.assignedDate.toDate() : new Date(),
      dueDate: initialData?.dueDate ? initialData.dueDate.toDate() : new Date(Date.now() + 86400000), // tomorrow
      allowSubmission: initialData?.allowSubmission ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attachments",
  });

  const handleUpload = (attachment: AttachmentData) => {
    if (fields.length >= 5) {
      form.setError("attachments", { message: "Maximum 5 attachments allowed" });
      return;
    }
    form.clearErrors("attachments");
    append(attachment);
  };

  const watchClassId = form.watch("classId");
  // Filter subjects based on selected class if classIds is mapped
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
                <Input placeholder="E.g., Chapter 1 Exercises" {...field} disabled={isLoading} />
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
                <Textarea placeholder="Homework instructions..." className="min-h-[120px]" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="assignedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Date</FormLabel>
                <FormControl>
                  <Input type="date" value={field.value ? field.value.toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(new Date(e.target.value))} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" value={field.value ? field.value.toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(new Date(e.target.value))} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="allowSubmission"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Allow Parent/Student Submissions
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  If disabled, parents will only view the homework but cannot submit attachments.
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-4 border rounded-md p-4">
          <div className="flex items-center justify-between">
            <FormLabel>Attachments (Optional, Max 5)</FormLabel>
            <FileUpload onUpload={handleUpload} maxSizeMB={5} label="Upload Attachment" />
          </div>
          {form.formState.errors.attachments && (
            <p className="text-sm text-destructive">{form.formState.errors.attachments.message as string}</p>
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
            <p className="text-sm text-muted-foreground text-center py-4">No attachments uploaded yet.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Homework" : "Publish Homework"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

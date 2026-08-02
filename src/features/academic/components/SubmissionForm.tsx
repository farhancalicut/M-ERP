"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { homeworkSubmissionSchema, HomeworkSubmissionValues } from "../schemas/academicSchemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FileUpload, AttachmentData } from "@/components/shared/FileUpload";
import { FilePreview } from "@/components/shared/FilePreview";

interface SubmissionFormProps {
  initialData?: any; 
  onSubmit: (data: HomeworkSubmissionValues) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function SubmissionForm({ initialData, onSubmit, isLoading, disabled }: SubmissionFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(homeworkSubmissionSchema),
    defaultValues: {
      submissionText: initialData?.submissionText || "",
      attachments: initialData?.attachments || [],
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
    form.clearErrors("submissionText"); // clear the top-level refine error
    append(attachment);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control as any}
          name="submissionText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Answers / Remarks (Optional if files attached)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Type your answers here..." 
                  className="min-h-[120px]" 
                  {...field} 
                  disabled={isLoading || disabled} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 border rounded-md p-4">
          <div className="flex items-center justify-between">
            <FormLabel>Attachments (Optional, Max 5)</FormLabel>
            {!disabled && (
              <FileUpload onUpload={handleUpload} maxSizeMB={5} label="Upload Work" />
            )}
          </div>
          {form.formState.errors.attachments && (
            <p className="text-sm text-destructive">{form.formState.errors.attachments.message as string}</p>
          )}
          
          {fields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {fields.map((field, index) => (
                disabled ? (
                  <FilePreview 
                    key={field.id} 
                    attachment={field as any} 
                    showDownload={true} 
                  />
                ) : (
                  <FilePreview 
                    key={field.id} 
                    attachment={field as any} 
                    onRemove={() => remove(index)} 
                    showDownload={true} 
                  />
                )
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No attachments uploaded.</p>
          )}
        </div>

        {!disabled && (
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Update Submission" : "Submit Homework"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

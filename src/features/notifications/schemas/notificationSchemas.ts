import { z } from "zod";
import { attachmentSchema } from "@/features/academic/schemas/academicSchemas";

export const noticeFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed").optional(),
  targetRoles: z.array(z.string()).min(1, "Please select a target audience"),
  targetClasses: z.array(z.string()).default([]),
  targetStudentIds: z.array(z.string()).default([]),
  expiryDate: z.coerce.date(),
  pinned: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "EXPIRED", "ARCHIVED"]).default("DRAFT"),
});

export type NoticeFormValues = z.infer<typeof noticeFormSchema>;


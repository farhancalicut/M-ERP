import { z } from "zod";
export const classSchema = z.object({
  globalClassId: z.string().min(1, "Please select a class"),
  division: z.string().optional(),
  displayOrder: z.coerce.number().min(0),
  isAlumni: z.boolean().default(false),
  classTeacherId: z.string().optional()
});
export type ClassFormData = z.infer<typeof classSchema>;

export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  displayOrder: z.coerce.number().min(0),
  classIds: z.array(z.string()).default([]),
  defaultTotalMarks: z.coerce.number().min(1, "Total marks must be at least 1").default(100),
  defaultPassMarks: z.coerce.number().min(0).default(40)
});
export type SubjectFormData = z.infer<typeof subjectSchema>;

export const academicYearSchema = z.object({
  name: z.string().min(1, "Year name is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});
export type AcademicYearFormData = z.infer<typeof academicYearSchema>;

export const teacherAssignmentSchema = z.object({
  teacherUid: z.string().min(1, "Teacher is required"),
  classIds: z.array(z.string()).min(1, "At least one class is required"),
  subjectIds: z.array(z.string())
});
export type TeacherAssignmentFormData = z.infer<typeof teacherAssignmentSchema>;


export const attachmentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number(),
});

export const homeworkFormSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed"),
  assignedDate: z.date({
    message: "Assigned date is required",
  }),
  dueDate: z.date({
    message: "Due date is required",
  }),
  allowSubmission: z.boolean().default(true),
});

export type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

export const assignmentFormSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed"),
  assignedDate: z.date({
    message: "Assigned date is required",
  }),
  dueDate: z.date({
    message: "Due date is required",
  }),
  totalMarks: z.coerce.number().min(1, "Total marks must be greater than 0"),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

export const studyMaterialFormSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  files: z.array(attachmentSchema).min(1, "At least one file is required").max(10, "Maximum 10 files allowed"),
});

export type StudyMaterialFormValues = z.infer<typeof studyMaterialFormSchema>;

export const homeworkSubmissionSchema = z.object({
  submissionText: z.string().max(1000, "Text is too long").optional(),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed").optional(),
}).refine(data => {
  const hasText = data.submissionText && data.submissionText.trim().length > 0;
  const hasFiles = data.attachments && data.attachments.length > 0;
  return hasText || hasFiles;
}, {
  message: "Either text or at least one attachment must be provided",
  path: ["submissionText"],
});

export type HomeworkSubmissionValues = z.infer<typeof homeworkSubmissionSchema>;

export const submissionReviewSchema = z.object({
  remarks: z.string().max(500, "Remarks are too long").optional(),
});

export type SubmissionReviewValues = z.infer<typeof submissionReviewSchema>;


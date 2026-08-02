import { z } from "zod";

export const studentAdmissionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  gender: z.enum(['MALE', 'FEMALE']),
  dob: z.date({
    message: "Date of birth is required",
  }),
  admissionDate: z.date({
    message: "Admission date is required",
  }),
  bloodGroup: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  fatherName: z.string().min(2, "Father name is required"),
  motherName: z.string().min(2, "Mother name is required"),
  guardianRelation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
  parentMobile: z.string().regex(/^\+?[0-9]{10,15}$/, "Valid mobile number required"),
  parentEmail: z.string().email("Valid email required"),
  photoUrl: z.string().url("Invalid photo URL").optional().or(z.literal("")),
  medicalNotes: z.string().optional(),
  identityMark: z.string().optional(),
  majorAchievements: z.string().optional(),
  
  // Admission Fee
  admissionFeeAmount: z.coerce.number().min(0, "Amount must be at least 0").optional(),
  admissionFeePaymentMethod: z.enum(["CASH", "BANK", "UPI", "OTHER", "PENDING"]).optional().default("PENDING"),
});

export type StudentAdmissionData = z.infer<typeof studentAdmissionSchema>;

export const studentEditSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  gender: z.enum(['MALE', 'FEMALE']),
  dob: z.date({
    message: "Date of birth is required",
  }),
  admissionDate: z.date({
    message: "Admission date is required",
  }),
  bloodGroup: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  photoUrl: z.string().url("Invalid photo URL").optional().or(z.literal("")),
  medicalNotes: z.string().optional(),
  identityMark: z.string().optional(),
  majorAchievements: z.string().optional(),
  guardianRelation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
});

export type StudentEditData = z.infer<typeof studentEditSchema>;

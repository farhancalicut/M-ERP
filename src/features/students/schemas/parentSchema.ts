import { z } from "zod";

export const parentEditSchema = z.object({
  fatherName: z.string().min(2, "Father name is required"),
  motherName: z.string().min(2, "Mother name is required"),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, "Valid mobile number required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

export type ParentEditData = z.infer<typeof parentEditSchema>;

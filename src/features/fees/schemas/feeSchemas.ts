import { z } from "zod";

export const feeCategorySchema = z.object({
  name: z.string().min(1, "Fee name is required").max(100),
  description: z.string().max(500).optional(),
  amount: z.coerce.number().min(0, "Amount must be greater than or equal to 0"),
  feeType: z.enum([
    "MONTHLY_TUITION",
    "ADMISSION",
    "EXAM",
    "BOOK",
    "UNIFORM",
    "TRANSPORT",
    "CUSTOM"
  ]),
  recurring: z.boolean(),
  isClassWise: z.boolean().optional().default(false),
  classAmounts: z.record(z.string(), z.coerce.number().min(0, "Amount must be greater than or equal to 0")).optional(),
});

export type FeeCategoryFormValues = z.infer<typeof feeCategorySchema>;

export const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Payment amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK", "UPI", "OTHER"]),
  remarks: z.string().max(500).optional(),
  paymentDate: z.date()
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

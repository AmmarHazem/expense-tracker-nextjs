import { z } from "zod";

export const expenseSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  categoryId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  merchant: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

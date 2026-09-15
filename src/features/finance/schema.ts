import { z } from "zod";

export const courseEditorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
  monthly_tuition: z.number({ message: "Enter a valid amount" }).min(0, "Must be 0 or more"),
  is_active: z.boolean(),
});
export type CourseEditorValues = z.infer<typeof courseEditorSchema>;

export const groupEditorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  course_id: z.string().trim().min(1, "Choose a course"),
  monthly_due_day: z.number().min(1, "1-28").max(28, "1-28"),
  current_month: z.number().min(1, "Must be 1 or more"),
  is_active: z.boolean(),
});
export type GroupEditorValues = z.infer<typeof groupEditorSchema>;

export const groupMemberEditorSchema = z.object({
  client_id: z.string().trim().min(1, "Choose a client"),
  monthly_amount_override: z.string().optional(),
});
export type GroupMemberEditorValues = z.infer<typeof groupMemberEditorSchema>;

export const newClientSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});
export type NewClientValues = z.infer<typeof newClientSchema>;

export const paymentEditorSchema = z.object({
  group_user_id: z.string().trim().min(1, "Choose a member"),
  amount: z.number({ message: "Enter a valid amount" }).positive("Must be greater than 0"),
  payment_month: z.string().trim().min(1, "Choose a month"),
  payment_type: z.string().trim().min(1),
  payment_method: z.string().trim().min(1),
  is_course_payment: z.boolean(),
  notes: z.string().optional(),
});
export type PaymentEditorValues = z.infer<typeof paymentEditorSchema>;

export const expenseEditorSchema = z.object({
  amount: z.number({ message: "Enter a valid amount" }).positive("Must be greater than 0"),
  description: z.string().trim().min(1, "Description is required"),
  category: z.string().trim().min(1, "Choose a category"),
  expense_date: z.string().trim().min(1, "Choose a date"),
  notes: z.string().optional(),
});
export type ExpenseEditorValues = z.infer<typeof expenseEditorSchema>;

export const expenseCategoryEditorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Key is required")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  label: z.string().trim().min(1, "Label is required"),
  color: z.string().trim().optional(),
});
export type ExpenseCategoryEditorValues = z.infer<typeof expenseCategoryEditorSchema>;

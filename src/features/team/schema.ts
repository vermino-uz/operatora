import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().max(200).optional(),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const editMemberSchema = z.object({
  full_name: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  password: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.length >= 8, "Password must be at least 8 characters"),
  role_id: z.string().optional().or(z.literal("")),
});

export type EditMemberFormValues = z.infer<typeof editMemberSchema>;

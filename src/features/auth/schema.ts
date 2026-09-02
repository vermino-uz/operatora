import { z } from "zod";

const phoneLike = (v: string) => {
  const s = v.trim();
  return (
    s.length > 0 &&
    !s.includes("@") &&
    /^[+()\-\s0-9]+$/.test(s) &&
    s.replace(/\D/g, "").length >= 9
  );
};

/**
 * Mirrors the backend's `LoginDto` constraints (email/phone min length 3,
 * password min length 6 — see `auth/dto/login.dto.ts`) purely for fast
 * client-side UX feedback. The backend remains the authoritative validator.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, "Enter your email or phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name"),
  lastName: z.string().trim().min(1, "Enter your last name"),
  phone: z
    .string()
    .trim()
    .refine(phoneLike, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code")
    .optional(),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const accountTypeSchema = z.object({
  account_type: z.enum(["team", "independent"]),
});

export type AccountTypeFormValues = z.infer<typeof accountTypeSchema>;

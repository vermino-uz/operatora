import { z } from "zod";

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

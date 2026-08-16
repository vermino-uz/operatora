import { z } from "zod";

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const requestPhoneOtpSchema = z.object({
  phone: z.string().trim().min(6, "Enter a valid phone number"),
});

export type RequestPhoneOtpFormValues = z.infer<typeof requestPhoneOtpSchema>;

export const confirmPhoneOtpSchema = z.object({
  otp_code: z.string().trim().min(1, "Enter the code you received"),
});

export type ConfirmPhoneOtpFormValues = z.infer<typeof confirmPhoneOtpSchema>;

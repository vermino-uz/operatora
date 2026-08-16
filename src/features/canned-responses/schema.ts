import { z } from "zod";

export const cannedResponseSchema = z.object({
  shortcut: z
    .string()
    .trim()
    .min(1, "Shortcut is required")
    .max(64, "Shortcut is too long")
    .regex(/^\/?[a-zA-Z0-9_-]+$/, "Use letters, numbers, - or _ only"),
  body: z.string().trim().min(1, "Message is required").max(4000, "Message is too long"),
  channels: z.array(z.string()).min(1, "Choose at least one channel"),
  is_active: z.boolean(),
});

export type CannedResponseFormValues = z.infer<typeof cannedResponseSchema>;

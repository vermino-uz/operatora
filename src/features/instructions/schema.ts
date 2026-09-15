import { z } from "zod";

import { INSTRUCTION_CATEGORIES, INSTRUCTION_PRIORITIES } from "@/features/instructions/types";

export const instructionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  category: z.enum(INSTRUCTION_CATEGORIES),
  priority: z.enum(INSTRUCTION_PRIORITIES),
  target_operators: z.string().trim().max(2000, "Too long"),
  tags: z.string().trim().max(2000, "Too long"),
  content: z.string().trim().min(1, "Content is required").max(20000, "Content is too long"),
});

export type InstructionFormValues = z.infer<typeof instructionSchema>;

export const quickLinkSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(2000, "URL is too long")
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a valid http(s) URL"),
});

export type QuickLinkFormValues = z.infer<typeof quickLinkSchema>;

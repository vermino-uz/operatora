import { z } from "zod";

import { CONTENT_FORMATS, CONTENT_PLATFORMS } from "@/features/social-media-advisor/types";

export const contentIdeaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().min(1, "Description is required").max(2000, "Description is too long"),
  platform: z.enum(CONTENT_PLATFORMS),
  format: z.enum(CONTENT_FORMATS),
  hashtags: z.string().trim().max(1000, "Too long"),
  topics: z.string().trim().max(1000, "Too long"),
  impact_score: z
    .number({ message: "Enter a number" })
    .int("Whole numbers only")
    .min(0, "Must be 0-100")
    .max(100, "Must be 0-100"),
});

export type ContentIdeaFormValues = z.infer<typeof contentIdeaSchema>;

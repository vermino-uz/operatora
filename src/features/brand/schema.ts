import { z } from "zod";

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Enter a 6-digit hex color, e.g. #1a56db");

export const brandSettingsSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), "Enter a full https:// URL"),
  colors: z
    .array(z.object({ hex: hexColorSchema, name: z.string().trim().max(40).optional() }))
    .max(8, "At most 8 colors"),
  fonts: z.string().trim().max(300).optional().or(z.literal("")),
  style: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BrandSettingsFormValues = z.infer<typeof brandSettingsSchema>;

export const brandDomainSchema = z.object({
  domain: z.string().trim().min(3, "Enter a domain, e.g. example.com"),
});

export type BrandDomainFormValues = z.infer<typeof brandDomainSchema>;

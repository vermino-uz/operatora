import { z } from "zod";

import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, PHONE_FORMAT_OPTIONS } from "@/features/settings/types";

export const generalSettingsSchema = z.object({
  workspace_name: z.string().trim().min(1, "Workspace name is required").max(200),
  phone_format: z.enum(PHONE_FORMAT_OPTIONS),
  currency: z.enum(CURRENCY_OPTIONS),
  language: z.enum(LANGUAGE_OPTIONS),
});

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export const notificationsSchema = z.object({
  email_new_lead: z.boolean(),
  telegram_new_message: z.boolean(),
});

export type NotificationsFormValues = z.infer<typeof notificationsSchema>;

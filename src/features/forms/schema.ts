import { z } from "zod";

import { FORM_FIELD_TYPES } from "@/features/forms/types";

export const formFieldEditorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Field name is required"),
  label: z.string().min(1, "Field label is required"),
  type: z.enum(FORM_FIELD_TYPES as [string, ...string[]]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export type FormFieldEditorValues = z.infer<typeof formFieldEditorSchema>;

export const formEditorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["general", "leads"]),
  status: z.enum(["draft", "published"]),
  thank_you_message: z.string().optional(),
  fields: z.array(formFieldEditorSchema).min(1, "Add at least one field"),
});

export type FormEditorValues = z.infer<typeof formEditorSchema>;

/** Same lead-intake preset the old `CreateFormDialog` auto-populated when
 * `type` switches to `"leads"` and no fields exist yet — matches the
 * `leads` table's real intake fields (`first_name`, `last_name`,
 * `phone_number`) plus the same two custom-field presets (`age`,
 * `marital_status`). Kept in English only (the old page localized these via
 * i18next; this rebuild has no i18n layer yet). */
export function leadFormFieldPresets(): FormFieldEditorValues[] {
  const id = () => crypto.randomUUID();
  return [
    { id: id(), name: "first_name", label: "First name", type: "text", required: true, placeholder: "John", options: [] },
    { id: id(), name: "last_name", label: "Last name", type: "text", required: true, placeholder: "Doe", options: [] },
    { id: id(), name: "phone_number", label: "Phone number", type: "phone", required: true, placeholder: "+1 555 123 4567", options: [] },
    { id: id(), name: "age", label: "Age", type: "number", required: false, placeholder: "", options: [] },
    {
      id: id(),
      name: "marital_status",
      label: "Marital status",
      type: "select",
      required: false,
      placeholder: "",
      options: ["Single", "Married", "Divorced", "Widowed"],
    },
  ];
}

export function blankFormField(): FormFieldEditorValues {
  return { id: crypto.randomUUID(), name: "", label: "", type: "text", required: false, placeholder: "", options: [] };
}

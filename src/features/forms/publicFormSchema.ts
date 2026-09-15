import { z } from "zod";

import type { PublicFormField } from "@/features/forms/publicFormTypes";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Builds a per-form Zod schema at render time, since a public form's field
 * set/requiredness is entirely server-defined data, not something knowable
 * statically. Every value round-trips through RHF as a string except
 * checkboxes (boolean) — numbers are still validated/parsed as strings so a
 * cleared numeric field can be distinguished from `0`. */
export function buildPublicFormSchema(fields: PublicFormField[]): z.ZodType<PublicFormValues, PublicFormValues> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = fieldToZod(field);
  }
  // The shape is only known at render time (server-defined field set), so
  // `z.object(shape)`'s inferred type is necessarily looser than the
  // `PublicFormValues` alias every RHF caller expects — every value is
  // still guaranteed `string | boolean` by `fieldToZod` above.
  return z.object(shape) as unknown as z.ZodType<PublicFormValues, PublicFormValues>;
}

function fieldToZod(field: PublicFormField): z.ZodTypeAny {
  const requiredMsg = `${field.label || "This field"} is required`;

  if (field.type === "checkbox") {
    const bool = z.boolean();
    return field.required ? bool.refine((v) => v === true, requiredMsg) : bool;
  }

  let schema = z.string().trim();
  if (field.required) {
    schema = schema.min(1, requiredMsg);
  }

  if (field.type === "email") {
    schema = schema.refine((v) => v.length === 0 || EMAIL_RE.test(v), "Enter a valid email address");
  }
  if (field.type === "number") {
    schema = schema.refine((v) => v.length === 0 || !Number.isNaN(Number(v)), "Enter a valid number");
  }
  if (field.type === "phone") {
    schema = schema.refine(
      (v) => v.length === 0 || v.replace(/\D/g, "").length >= 7,
      "Enter a valid phone number",
    );
  }
  if (field.type === "select" && field.options && field.options.length > 0) {
    schema = schema.refine(
      (v) => v.length === 0 || field.options!.includes(v),
      "Choose one of the listed options",
    );
  }

  return schema;
}

export type PublicFormValues = Record<string, string | boolean>;

export function defaultPublicFormValues(fields: PublicFormField[]): PublicFormValues {
  const values: PublicFormValues = {};
  for (const field of fields) {
    values[field.name] = field.type === "checkbox" ? false : "";
  }
  return values;
}

/** Drops empty/unset values and coerces `number` fields before submit,
 * mirroring the old frontend's `cleanedData` step. */
export function cleanPublicFormValues(
  fields: PublicFormField[],
  values: PublicFormValues,
): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) continue;
      cleaned[field.name] = field.type === "number" ? Number(trimmed) : trimmed;
    } else {
      cleaned[field.name] = value;
    }
  }
  return cleaned;
}

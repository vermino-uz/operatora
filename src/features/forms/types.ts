import type { PublicFormField, PublicFormFieldType } from "@/features/forms/publicFormTypes";

/**
 * Form BUILDER types — distinct from the public submission view's
 * `PublicForm`/`PublicFormField` in `publicFormTypes.ts`, though the field
 * shape itself is identical (both read/write the same `forms.fields` Json
 * column, confirmed against `prisma/schema.prisma`'s `forms` model). Reused
 * here rather than duplicated.
 */
export type { PublicFormField as FormBuilderField, PublicFormFieldType as FormBuilderFieldType };

export const FORM_FIELD_TYPES: PublicFormFieldType[] = [
  "text",
  "email",
  "phone",
  "number",
  "textarea",
  "select",
  "checkbox",
];

export type FormType = "general" | "leads";
export type FormStatus = "draft" | "published";

/** Full `forms` row, as read/written via the db-proxy (see
 * `services/api/forms.ts`) — this table has no dedicated REST controller
 * beyond the public read-only `GET /public/forms/:idOrSlug`, confirmed by
 * grepping the whole backend tree for a `FormsController`/`'forms'`
 * `@Controller`. */
export interface FormRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  fields: PublicFormField[];
  thank_you_message: string | null;
  slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  workspace_id?: string | null;
}

/** `form_submissions` row — read-only from the builder's perspective (the
 * public submission endpoint is the only writer; see `publicFormTypes.ts`
 * for that gap). */
export interface FormSubmissionRow {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_by: string | null;
  submitted_at: string;
  lead_id: string | null;
  archived: boolean;
  workspace_id: string | null;
}

/** Defensive coercion of a db-proxy `forms` row — the `fields` Json column
 * has no server-side shape enforcement, same reasoning as
 * `publicFormTypes.ts#normalizePublicForm`. */
export function normalizeFormRow(raw: unknown): FormRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rawFields = Array.isArray(row.fields) ? row.fields : [];
  const fields: PublicFormField[] = rawFields.map((f, i) => {
    const field = (f ?? {}) as Record<string, unknown>;
    const type: PublicFormFieldType =
      typeof field.type === "string" && FORM_FIELD_TYPES.includes(field.type as PublicFormFieldType)
        ? (field.type as PublicFormFieldType)
        : "text";
    return {
      id: typeof field.id === "string" ? field.id : `field-${i}`,
      name: typeof field.name === "string" && field.name.trim() ? field.name : `field_${i}`,
      label: typeof field.label === "string" ? field.label : "",
      type,
      required: Boolean(field.required),
      placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined,
      options: Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : undefined,
    };
  });

  return {
    id: typeof row.id === "string" ? row.id : "",
    name: typeof row.name === "string" ? row.name : "Untitled form",
    description: typeof row.description === "string" ? row.description : null,
    type: typeof row.type === "string" ? row.type : "general",
    status: typeof row.status === "string" ? row.status : "draft",
    fields,
    thank_you_message: typeof row.thank_you_message === "string" ? row.thank_you_message : null,
    slug: typeof row.slug === "string" ? row.slug : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
    workspace_id: typeof row.workspace_id === "string" ? row.workspace_id : null,
  };
}

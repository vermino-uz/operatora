/**
 * `/form/:formId` public submission view. Backend contract confirmed by
 * reading (not modifying) `/www/wwwroot/dev.operatora/app/backend/src`:
 *
 * - `GET /public/forms/:idOrSlug` (`public-endpoints.controller.ts`,
 *   `@Public()`) — returns the raw `forms` Prisma row (`functions.handlers
 *   .ts`'s `getPublicForm`). Confirmed real and unauthenticated.
 * - Submission (`form_submissions` insert) has **no equivalent NestJS
 *   route** — the old frontend (`PublicForm.tsx`) writes directly to
 *   Supabase (`supabase.from("form_submissions").insert(...)`), which is
 *   exactly the Supabase-compat debt `ARCHITECTURE.md` says not to
 *   replicate, and the JWT-guarded `POST /db/:table/query` proxy can't be
 *   used here either (this is an anonymous, unauthenticated page). This is
 *   a genuine backend gap — same category as the "no `tasks` Prisma model"
 *   gap `ARCHITECTURE.md` already flagged for a different feature.
 *   `publicFormsApi.submit()` below calls `POST /public/forms/:idOrSlug`
 *   (the natural REST completion of the existing public-forms resource,
 *   matching this controller's other `@Public() @Post(...)` endpoints like
 *   `lead-intake`/`feedback`) — **this backend route does not exist yet**
 *   and must be added before this page can actually accept a submission in
 *   production. Tracked in `PROGRESS.md` Phase 2e. The frontend still
 *   surfaces a real error (via `ErrorState`/`ApiError`) rather than faking
 *   success if the backend 404s.
 */

export type PublicFormFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "checkbox";

export interface PublicFormField {
  id: string;
  name: string;
  label: string;
  type: PublicFormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface PublicForm {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  thank_you_message: string | null;
  fields: PublicFormField[];
  workspace_id: string;
}

/** Normalizes the raw `forms` row's `fields` (stored as `Json`, shape not
 * enforced server-side) into a safe, typed array — mirrors the defensive
 * coercion the old frontend did client-side for the same reason. */
export function normalizePublicForm(raw: unknown): PublicForm {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rawFields = Array.isArray(row.fields) ? row.fields : [];
  const fields: PublicFormField[] = rawFields.map((f, i) => {
    const field = (f ?? {}) as Record<string, unknown>;
    const type: PublicFormFieldType =
      typeof field.type === "string" &&
      ["text", "email", "phone", "number", "textarea", "select", "checkbox"].includes(field.type)
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
    name: typeof row.name === "string" ? row.name : "Form",
    description: typeof row.description === "string" ? row.description : null,
    type: typeof row.type === "string" ? row.type : "generic",
    status: typeof row.status === "string" ? row.status : "active",
    thank_you_message: typeof row.thank_you_message === "string" ? row.thank_you_message : null,
    fields,
    workspace_id: typeof row.workspace_id === "string" ? row.workspace_id : "",
  };
}

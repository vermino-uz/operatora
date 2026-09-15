import { dbProxyQuery } from "@/services/api/db-proxy";
import { normalizeFormRow, type FormBuilderField, type FormRow, type FormSubmissionRow } from "@/features/forms/types";

/**
 * Form BUILDER CRUD — see `features/forms/types.ts` for the confirmed
 * backend trace: `forms`/`form_submissions` have a db-proxy `table-registry.ts`
 * entry (`scope: 'workspace', writeRoles: MANAGER_ROLES` for `forms`) but no
 * dedicated REST controller of their own beyond the public read-only
 * `GET /public/forms/:idOrSlug` (`public-endpoints.controller.ts`). This is
 * the sanctioned db-proxy escape hatch (same category as `instructions.ts`/
 * `cannedResponses.ts`) — confirmed by grepping the whole backend `src/`
 * tree for a `FormsController` and finding none. `workspace_id` scoping and
 * `writeRoles` are enforced server-side from the JWT; never passed explicitly.
 *
 * The db-proxy has no relational-join/embedded-count support ("bizda rel
 * join'lar yo'q" — `db-proxy.service.ts`), so submission counts per form are
 * computed client-side from a single `form_submissions` list query rather
 * than a Postgrest-style `form_submissions(count)` embed the old (Supabase)
 * frontend used — see `submissionCounts()` below.
 */

const FORMS_TABLE = "forms";
const SUBMISSIONS_TABLE = "form_submissions";

export const formsApi = {
  async list(): Promise<FormRow[]> {
    const rows = await dbProxyQuery<unknown[]>(FORMS_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return (rows ?? []).map(normalizeFormRow);
  },

  async get(id: string): Promise<FormRow | null> {
    const rows = await dbProxyQuery<unknown[]>(FORMS_TABLE, {
      method: "select",
      select: "*",
      filters: [{ column: "id", op: "eq", value: id }],
      limit: 1,
    });
    const row = rows?.[0];
    return row ? normalizeFormRow(row) : null;
  },

  async create(input: {
    name: string;
    description: string | null;
    type: string;
    status: string;
    thank_you_message: string | null;
    fields: FormBuilderField[];
    created_by: string | null;
  }): Promise<FormRow> {
    const rows = await dbProxyQuery<unknown[]>(FORMS_TABLE, {
      method: "insert",
      values: [input],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeFormRow(row);
  },

  async update(
    id: string,
    input: {
      name: string;
      description: string | null;
      type: string;
      status: string;
      thank_you_message: string | null;
      fields: FormBuilderField[];
    },
  ): Promise<FormRow> {
    const rows = await dbProxyQuery<unknown[]>(FORMS_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { ...input, updated_at: new Date().toISOString() },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return normalizeFormRow(row);
  },

  /** Bulk delete — used for both "delete selected" and "clear all"
   * (old page's two mutations collapse into one call with `in`). */
  async removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await dbProxyQuery<unknown[]>(FORMS_TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "in", value: ids }],
    });
  },

  /** Counts of non-archived submissions per form, for the given form ids —
   * one request instead of N, computed client-side (see file doc comment). */
  async submissionCounts(formIds: string[]): Promise<Record<string, number>> {
    if (formIds.length === 0) return {};
    const rows = await dbProxyQuery<Array<{ form_id: string }>>(SUBMISSIONS_TABLE, {
      method: "select",
      select: "form_id",
      filters: [
        { column: "form_id", op: "in", value: formIds },
        { column: "archived", op: "eq", value: false },
      ],
    });
    const counts: Record<string, number> = {};
    for (const row of rows ?? []) {
      counts[row.form_id] = (counts[row.form_id] ?? 0) + 1;
    }
    return counts;
  },

  async submissions(formId: string): Promise<FormSubmissionRow[]> {
    const rows = await dbProxyQuery<FormSubmissionRow[]>(SUBMISSIONS_TABLE, {
      method: "select",
      select: "*",
      filters: [{ column: "form_id", op: "eq", value: formId }],
      order: [{ column: "submitted_at", ascending: false }],
    });
    return rows ?? [];
  },
};

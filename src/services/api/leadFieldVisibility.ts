import { apiFetch } from "@/services/api/client";
import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadCustomFieldDef } from "@/features/leads/customFieldTypes";

/** One row of `lead_field_visibility` (`preview-leads.controller.ts`) — the
 * caller's own saved Kanban-card field visibility, per field key. Custom
 * fields are namespaced `custom_field_<field_name>`, matching the old
 * frontend's `LeadFieldVisibilityManager.tsx` convention exactly (same
 * backend table, same key shape — traced directly, not guessed). */
export interface FieldVisibilityRow {
  field_name: string;
  is_visible: boolean;
  display_order: number;
}

/**
 * Kanban-CARD field visibility (Phase 2c-6) — `preview-leads.controller.ts`,
 * a real, per-user, dedicated REST surface (`lead_field_visibility` table).
 * `getBundle()` uses the combined endpoint (`GET /preview-leads/
 * field-settings`) that returns the caller's saved visibility rows AND the
 * workspace's custom-field definitions in one round trip — the same bundle
 * the old frontend's `LeadFieldVisibilityManager` dialog fetches.
 */
export const cardFieldVisibilityApi = {
  async getBundle(): Promise<{ visibility: FieldVisibilityRow[]; customFields: LeadCustomFieldDef[] }> {
    return apiFetch(`/preview-leads/field-settings`);
  },
  /** `POST /preview-leads` — replaces the caller's entire saved set. */
  async save(fields: FieldVisibilityRow[]): Promise<{ saved: number }> {
    return apiFetch<{ saved: number }>(`/preview-leads`, { method: "POST", body: { fields } });
  },
};

/** Details-panel field visibility (Phase 2c-6) — the old frontend's
 * `useLeadDetailsFieldVisibility` calls Supabase directly against
 * `user_preferences` (`preference_type = 'lead_details_visibility'`), not a
 * dedicated REST endpoint. Traced the equivalent real path in this backend:
 * `user_preferences` is registered `scope: 'user'` in the db-proxy's
 * `table-registry.ts` (auto-scoped to the caller's own `user_id` server-side
 * from the JWT, confirmed in `db-proxy.service.ts`'s `scopeValue()`/
 * `appendScopeFilter()` — this client never sends `user_id` explicitly,
 * same pattern `leadTags.ts` already established for a workspace-scoped
 * table). Read via `select` + `eq preference_type`; written via `upsert`
 * with `onConflict: 'user_id,preference_type'` (matches the table's real
 * `@@unique([user_id, preference_type])` constraint, confirmed in
 * `prisma/schema.prisma`) so this never creates a duplicate row per save. */
const DETAILS_VISIBILITY_PREFERENCE_TYPE = "lead_details_visibility";

interface UserPreferenceRow {
  preferences: Record<string, boolean> | null;
}

export const detailsFieldVisibilityApi = {
  async get(): Promise<Record<string, boolean>> {
    const rows = await dbProxyQuery<UserPreferenceRow[]>("user_preferences", {
      method: "select",
      select: "preferences",
      filters: [{ column: "preference_type", op: "eq", value: DETAILS_VISIBILITY_PREFERENCE_TYPE }],
      limit: 1,
    });
    return rows?.[0]?.preferences ?? {};
  },
  async save(preferences: Record<string, boolean>): Promise<void> {
    await dbProxyQuery("user_preferences", {
      method: "upsert",
      onConflict: "user_id,preference_type",
      values: [{ preference_type: DETAILS_VISIBILITY_PREFERENCE_TYPE, preferences }],
    });
  },
};

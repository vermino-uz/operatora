import { apiFetch } from "@/services/api/client";
import type { LeadCustomFieldDef, UpsertLeadCustomFieldPayload } from "@/features/leads/customFieldTypes";

/**
 * Workspace lead custom-field DEFINITIONS (Phase 2c-6) — dedicated,
 * validated CRUD (`leads-controller/lead-custom-fields/
 * lead-custom-fields.controller.ts`/`.service.ts`), distinct from the
 * generic db-proxy write path (which has no per-table validation) —
 * confirmed the backend deliberately built this instead of exposing
 * `lead_custom_fields` through the proxy, so `field_type`/`field_options`
 * always match the type-specific shape the service's own `validate()`
 * enforces (see `features/leads/customFieldTypes.ts`'s header comment).
 * Workspace-scoped server-side from the JWT.
 */
export const leadCustomFieldsApi = {
  async list(): Promise<LeadCustomFieldDef[]> {
    return apiFetch<LeadCustomFieldDef[]>(`/lead-custom-fields`);
  },
  async create(payload: UpsertLeadCustomFieldPayload): Promise<LeadCustomFieldDef> {
    return apiFetch<LeadCustomFieldDef>(`/lead-custom-fields`, { method: "POST", body: payload });
  },
  async update(id: string, payload: UpsertLeadCustomFieldPayload): Promise<LeadCustomFieldDef> {
    return apiFetch<LeadCustomFieldDef>(`/lead-custom-fields/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  async remove(id: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/lead-custom-fields/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

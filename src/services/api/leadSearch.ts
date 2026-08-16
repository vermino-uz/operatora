import { apiFetch } from "@/services/api/client";

/** `lead-search.controller.ts`'s lightweight lookup result — id + a
 * display name the backend itself computes (`displayName()`: first+last
 * name, falling back to phone, falling back to "Lead"). */
export interface LeadSearchResult {
  id: string;
  name: string;
}

/** `GET /lead-search/by-ids`'s richer resolve result — includes `age`/
 * `custom_fields` so a `rollup` field can aggregate over them client-side
 * (see `computeRollup()` in `features/leads/customFieldTypes.ts`). */
export interface LeadSearchResolved {
  id: string;
  name: string;
  age: number | null;
  custom_fields: Record<string, unknown>;
}

/**
 * Workspace-scoped lead lookup for the `relation` custom-field type
 * (Phase 2c-6) — `leads-controller/lead-search/lead-search.{controller,
 * service}.ts`, real and dedicated exactly for this purpose (confirmed
 * directly in the service's own doc comment: "a search box (id + name) and
 * a by-ids resolver (for chips + rollup aggregation)"). Kept separate from
 * the heavy paginated `leads-list`/`lead-board` endpoints.
 */
export const leadSearchApi = {
  async search(q: string, limit = 20): Promise<LeadSearchResult[]> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (q) qs.set("q", q);
    return apiFetch<LeadSearchResult[]>(`/lead-search?${qs.toString()}`);
  },
  async byIds(ids: string[]): Promise<LeadSearchResolved[]> {
    if (ids.length === 0) return [];
    return apiFetch<LeadSearchResolved[]>(`/lead-search/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
  },
};

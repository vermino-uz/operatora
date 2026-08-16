import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadTag } from "@/features/leads/types";

/**
 * Lead Tags tab (Phase 2c-4) — `lead_tags` (catalog) + `lead_tag_assignments`
 * (M2M), both registered `scope: 'workspace', writeRoles: ALL_APP_ROLES` in
 * the backend's `table-registry.ts` (no dedicated REST controller exists —
 * traced directly, confirmed the same table pair `features/lead-automations/`
 * already reads via `dbProxyQuery` for its tag-picker action, see
 * `services/api/leadAutomations.ts`'s `listTags()`; this is the same
 * catalog table, not a duplicate). Field set mirrors the old frontend's
 * `hooks/useLeadTags.ts` (read for reference only, never modified).
 */
const TAGS_TABLE = "lead_tags";
const ASSIGNMENTS_TABLE = "lead_tag_assignments";

/** Palette used when auto-assigning a color to a newly created tag — same
 * values as the old frontend's `TAG_COLORS` so freshly created tags look
 * consistent with any pre-existing ones from that app. */
export const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#ec4899", "#f43f5e", "#64748b",
];

function pickColor(name: string, used: string[]): string {
  const free = TAG_COLORS.find((c) => !used.includes(c));
  if (free) return free;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length]!;
}

export const leadTagsApi = {
  /** Full workspace tag catalog (workspace-scoped server-side via the JWT). */
  async listCatalog(): Promise<LeadTag[]> {
    const rows = await dbProxyQuery<LeadTag[]>(TAGS_TABLE, {
      method: "select",
      select: "id, name, color",
      order: [{ column: "name", ascending: true }],
    });
    return rows ?? [];
  },

  /** Tag ids currently assigned to one lead. */
  async listAssignedTagIds(leadId: string): Promise<string[]> {
    const rows = await dbProxyQuery<{ tag_id: string }[]>(ASSIGNMENTS_TABLE, {
      method: "select",
      select: "tag_id",
      filters: [{ column: "lead_id", op: "eq", value: leadId }],
    });
    return (rows ?? []).map((r) => r.tag_id);
  },

  /** Get-or-create by case-insensitive name match, matching the old
   * frontend's own dedupe behavior (`useLeadTagMutations`'s `createTag`) so
   * typing an existing tag's name never creates a visual duplicate. */
  async getOrCreateTag(name: string, color?: string): Promise<LeadTag> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Tag name is required");

    const existing = await dbProxyQuery<LeadTag[]>(TAGS_TABLE, {
      method: "select",
      select: "id, name, color",
      filters: [{ column: "name", op: "ilike", value: trimmed }],
    });
    if (existing?.[0]) return existing[0];

    const all = await dbProxyQuery<{ color: string }[]>(TAGS_TABLE, { method: "select", select: "color" });
    const used = (all ?? []).map((r) => r.color);
    const chosen = color || pickColor(trimmed, used);

    const rows = await dbProxyQuery<LeadTag[]>(TAGS_TABLE, {
      method: "insert",
      values: [{ name: trimmed, color: chosen }],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  /** Replace a lead's full assigned-tag set (delete-then-insert, same
   * shape as the old frontend's `setLeadTags` mutation). */
  async setLeadTags(leadId: string, tagIds: string[]): Promise<void> {
    await dbProxyQuery(ASSIGNMENTS_TABLE, {
      method: "delete",
      filters: [{ column: "lead_id", op: "eq", value: leadId }],
    });
    if (tagIds.length > 0) {
      await dbProxyQuery(ASSIGNMENTS_TABLE, {
        method: "insert",
        values: tagIds.map((tag_id) => ({ lead_id: leadId, tag_id })),
      });
    }
  },
};

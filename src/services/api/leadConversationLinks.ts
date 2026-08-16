import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadLinkedConversation } from "@/features/leads/types";

/**
 * Lead Conversations tab (Phase 2c-4) — linking mechanism confirmed
 * directly in the old frontend's `LinkConversationDialog.tsx` (read for
 * reference only): a conversation is "linked" to a lead by writing
 * `{lead_id}` into its `entities` jsonb array column, no dedicated join
 * table. `conversations` is registered in the backend's `table-registry.ts`
 * (`scope: 'workspace', writeRoles: ALL_APP_ROLES`), so both reading and
 * writing `entities` are real, callable operations via the db-proxy.
 *
 * Deliberately NOT using the proxy's `contains`/`cs` filter op to query
 * "conversations where entities @> [{lead_id}]" server-side: read
 * `db-proxy.service.ts`'s filter builder directly — the `cs`/`contains`
 * case pushes the raw JS array as the SQL parameter with no `::jsonb` cast
 * (`${col} @> $idx`, `params.push(f.value)`), unlike that same file's own
 * `values` insert/update path, which explicitly JSON-stringifies and casts
 * (`$${idx}::jsonb`, see its own comment on why the cast is required to
 * avoid an "invalid input syntax for type json" error). A raw JS array bound
 * without a cast against a jsonb column is a real, traceable landmine, not
 * a guess — so this reads a bounded, most-recent slice of the workspace's
 * conversations and filters `entities` client-side instead (same shape as
 * `LinkConversationDialog.tsx`'s own `.limit(100)` + client-filter query).
 * Known limitation: a conversation linked long ago that has since scrolled
 * outside the most-recent 300 won't surface here — see PROGRESS.md.
 */
const TABLE = "conversations";
const SELECT_COLUMNS =
  "id, client_name, client_phone, conversation_date, conversation_time, status, ai_score, sentiment, entities";
const RECENT_LIMIT = 300;

function extractLeadIds(entities: unknown): string[] {
  if (!Array.isArray(entities)) return [];
  return entities
    .filter((e): e is { lead_id?: string } => Boolean(e) && typeof e === "object")
    .map((e) => e.lead_id)
    .filter((id): id is string => typeof id === "string");
}

/**
 * Reverse-direction lookup for the Conversations-side "Link lead" affordance
 * (Phase 2c-12): a conversation's own `entities` jsonb is already present on
 * every `GET /api/conversation/:id` response (no extra request), so this
 * just narrows it to the single linked lead id, if any — same jsonb shape
 * `extractLeadIds` above already parses for the Leads-side Conversations tab.
 */
export function getLinkedLeadId(entities: unknown): string | null {
  return extractLeadIds(entities)[0] ?? null;
}

export const leadConversationLinksApi = {
  async listLinked(leadId: string): Promise<LeadLinkedConversation[]> {
    const rows = await dbProxyQuery<LeadLinkedConversation[]>(TABLE, {
      method: "select",
      select: SELECT_COLUMNS,
      order: [{ column: "created_at", ascending: false }],
      limit: RECENT_LIMIT,
    });
    return (rows ?? []).filter((row) => extractLeadIds(row.entities).includes(leadId));
  },

  /** Recent conversations not yet linked to this lead, for the "link a
   * conversation" picker — client-filtered by name/phone substring, same
   * bounded-recent-scan tradeoff as `listLinked`. */
  async searchUnlinked(leadId: string, query: string): Promise<LeadLinkedConversation[]> {
    const rows = await dbProxyQuery<LeadLinkedConversation[]>(TABLE, {
      method: "select",
      select: SELECT_COLUMNS,
      order: [{ column: "created_at", ascending: false }],
      limit: RECENT_LIMIT,
    });
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => !extractLeadIds(row.entities).includes(leadId))
      .filter(
        (row) =>
          !q ||
          row.client_name?.toLowerCase().includes(q) ||
          row.client_phone?.toLowerCase().includes(q),
      )
      .slice(0, 25);
  },

  async link(conversationId: string, leadId: string): Promise<void> {
    const current = await dbProxyQuery<{ entities: unknown }[]>(TABLE, {
      method: "select",
      select: "entities",
      filters: [{ column: "id", op: "eq", value: conversationId }],
    });
    const existing = Array.isArray(current?.[0]?.entities) ? (current[0]!.entities as Record<string, unknown>[]) : [];
    const withoutLead = existing.filter((e) => !(e && typeof e === "object" && "lead_id" in e));
    const nextEntities = [...withoutLead, { lead_id: leadId }];
    await dbProxyQuery(TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: conversationId }],
      values: { entities: nextEntities },
    });
  },

  async unlink(conversationId: string): Promise<void> {
    const current = await dbProxyQuery<{ entities: unknown }[]>(TABLE, {
      method: "select",
      select: "entities",
      filters: [{ column: "id", op: "eq", value: conversationId }],
    });
    const existing = Array.isArray(current?.[0]?.entities) ? (current[0]!.entities as Record<string, unknown>[]) : [];
    const withoutLead = existing.filter((e) => !(e && typeof e === "object" && "lead_id" in e));
    await dbProxyQuery(TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: conversationId }],
      values: { entities: withoutLead },
    });
  },
};

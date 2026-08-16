import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadLifecycleEvent } from "@/features/leads/types";

/**
 * Lead Timeline/Activity tab (Phase 2c-4) — `lead_lifecycle_events`, an
 * immutable, DB-triggered journal (`table-registry.ts`: `readOnly: true`,
 * every mutation happens inside Postgres itself). Field set and ordering
 * match the old frontend's `lib/leadLifecycleEvents.ts` `fetchLeadLifecycleEvents()`
 * exactly (read for reference only, never modified) — most-recent-first,
 * capped at 100 rows (a lead accumulates a handful of these per real
 * lifecycle transition, never thousands).
 */
const TABLE = "lead_lifecycle_events";
const SELECT_COLUMNS = [
  "id",
  "event_seq",
  "workspace_id",
  "lead_id",
  "event_type",
  "from_column_id",
  "to_column_id",
  "from_board_id",
  "to_board_id",
  "from_board_name",
  "to_board_name",
  "from_stage_name",
  "to_stage_name",
  "sold",
  "archived",
  "deleted",
  "actor_id",
  "occurred_at",
  "recorded_at",
  "is_inferred",
  "history_complete",
].join(", ");

export const leadLifecycleEventsApi = {
  async list(leadId: string): Promise<LeadLifecycleEvent[]> {
    const rows = await dbProxyQuery<LeadLifecycleEvent[]>(TABLE, {
      method: "select",
      select: SELECT_COLUMNS,
      filters: [{ column: "lead_id", op: "eq", value: leadId }],
      order: [
        { column: "occurred_at", ascending: false },
        { column: "event_seq", ascending: false },
      ],
      limit: 100,
    });
    return rows ?? [];
  },
};

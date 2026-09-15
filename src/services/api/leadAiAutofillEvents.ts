import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadAiAutofillEvent } from "@/features/leads/types";

/**
 * Lead card "AI auto-fill" status/history — `lead_ai_autofill_events`,
 * an append-only trail written only by the backend's
 * `CallCustomFieldAutofillService` (`table-registry.ts`: `readOnly: true`,
 * same pattern as `leadLifecycleEventsApi`). Most-recent-first, capped at
 * 50 rows (a lead gets at most one of these per call).
 */
const TABLE = "lead_ai_autofill_events";
const SELECT_COLUMNS = [
  "id",
  "workspace_id",
  "lead_id",
  "conversation_id",
  "board_id",
  "field_names",
  "field_values",
  "created_at",
].join(", ");

export const leadAiAutofillEventsApi = {
  async list(leadId: string): Promise<LeadAiAutofillEvent[]> {
    const rows = await dbProxyQuery<LeadAiAutofillEvent[]>(TABLE, {
      method: "select",
      select: SELECT_COLUMNS,
      filters: [{ column: "lead_id", op: "eq", value: leadId }],
      order: [{ column: "created_at", ascending: false }],
      limit: 50,
    });
    return rows ?? [];
  },
};

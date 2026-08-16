import { apiFetch } from "@/services/api/client";
import type { OperatorActivitySummaryMap } from "@/features/team/types";

interface ActivitySummaryRow {
  operator_id?: string;
  active_seconds?: number;
  idle_seconds?: number;
  actions_count?: number;
  last_ping_at?: string | null;
}

/** `GET /operator-activity/summary` — traced from
 * `useOperatorActivitySummary.ts` / `operator-activity.controller.ts`.
 * Defaults to today's date range when `from`/`to` are omitted. Same
 * view-role gate as presence. */
export const activityApi = {
  async summary(workspaceId: string): Promise<OperatorActivitySummaryMap> {
    const data = await apiFetch<{ operators?: ActivitySummaryRow[] }>(
      `/operator-activity/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    const map: OperatorActivitySummaryMap = {};
    for (const row of data.operators ?? []) {
      if (!row.operator_id) continue;
      map[row.operator_id] = {
        active_seconds: Number(row.active_seconds) || 0,
        idle_seconds: Number(row.idle_seconds) || 0,
        actions_count: Number(row.actions_count) || 0,
        last_ping_at: row.last_ping_at ?? null,
      };
    }
    return map;
  },
};

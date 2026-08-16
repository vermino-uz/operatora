import { dbProxyQuery } from "@/services/api/db-proxy";
import type { AutomationRuleRow, AutomationRunRow, TagOption } from "@/features/lead-automations/types";

const RULES_TABLE = "automation_rules";
const RUNS_TABLE = "automation_runs";
const TAGS_TABLE = "lead_tags";

export const leadAutomationsApi = {
  /** Workspace-scoped server-side via the JWT (db-proxy `table-registry.ts`)
   * — filters to `kind = 'automation'` client-side, same as the old
   * frontend, since notification rules live in the same table. */
  async list(): Promise<AutomationRuleRow[]> {
    const rows = await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return (rows ?? []).filter((r) => (r.kind ?? "automation") === "automation");
  },

  async create(payload: Record<string, unknown>): Promise<AutomationRuleRow> {
    const rows = await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, {
      method: "insert",
      values: [payload],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  async update(id: string, payload: Record<string, unknown>): Promise<AutomationRuleRow> {
    const rows = await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: payload,
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { is_active: isActive, updated_at: new Date().toISOString() },
      returning: "representation",
    });
  },

  async unpause(row: AutomationRuleRow): Promise<void> {
    const tc = { ...(row.trigger_config ?? {}) };
    delete (tc as Record<string, unknown>)._meta;
    await dbProxyQuery<AutomationRuleRow[]>(RULES_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: row.id }],
      values: { is_active: true, trigger_config: tc, updated_at: new Date().toISOString() },
      returning: "representation",
    });
  },

  /** `readRoles: MANAGER_ROLES`, so a non-manager viewer gets a real 403,
   * surfaced via `ErrorState`, not silently swallowed like the old
   * frontend's fallback-to-legacy-run-log behavior (that legacy fallback
   * predates the dedicated `automation_runs` table and isn't reproduced
   * here — the table is confirmed live in the registry). */
  async runHistory(ruleId: string): Promise<AutomationRunRow[]> {
    const rows = await dbProxyQuery<AutomationRunRow[]>(RUNS_TABLE, {
      method: "select",
      select: "id, rule_id, lead_id, trigger_type, status, message, created_at",
      filters: [{ column: "rule_id", op: "eq", value: ruleId }],
      order: [{ column: "created_at", ascending: false }],
      limit: 25,
    });
    return rows ?? [];
  },

  async listTags(): Promise<TagOption[]> {
    const rows = await dbProxyQuery<TagOption[]>(TAGS_TABLE, {
      method: "select",
      select: "id, name",
      order: [{ column: "name", ascending: true }],
    });
    return rows ?? [];
  },
};

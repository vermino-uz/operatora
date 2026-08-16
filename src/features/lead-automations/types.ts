/**
 * Lead Automations settings — traced from the old frontend's
 * `AutomationRulesSettings.tsx` → `LeadAutomationsPanel.tsx` (rendered
 * `variant="settings" kind="automation"`, workspace-wide across every
 * board — distinct from the same component's `dialog` variant used
 * per-board inside the Leads feature, which isn't built in this app yet).
 * The underlying table (`automation_rules`) has no dedicated REST
 * controller — the old frontend reads/writes it via `supabase.from()`,
 * routed through the same `POST /db/:table/query` compat proxy already
 * used for Canned Responses. Confirmed in the real backend's
 * `db-proxy/table-registry.ts`: `{ table: 'automation_rules', scope:
 * 'workspace', writeRoles: MANAGER_ROLES }` and `{ table:
 * 'automation_runs', scope: 'workspace', readRoles: MANAGER_ROLES,
 * writeRoles: ADMIN_ROLES }` (run history is read-only from this UI, so
 * only `readRoles` matters here).
 *
 * `kind` distinguishes this section (`'automation'`, can move/assign/edit
 * leads) from Notifications' own rule builder (`'notification'`,
 * reach-only actions) — both run on the same engine/table but are
 * deliberately separate Settings sections, matching the old frontend's own
 * split (`AutomationRulesSettings` vs. `NotificationRulesSettings`). This
 * pass only builds the `'automation'` surface — the old frontend's
 * Notification Rules component is a distinct, richer feature (personal
 * Telegram account-link flow, `/notification-rules/*`) already noted as
 * deferred from the `notifications` settings section.
 */

export type TriggerType =
  | "lead_added"
  | "lead_column_change"
  | "lead_field_changed"
  | "lead_signal_threshold"
  | "schedule"
  | "deadline_due";

export type ActionType =
  | "move_to_column"
  | "assign_operator"
  | "edit_field"
  | "sms_notify"
  | "notify_user"
  | "send_webhook"
  | "telegram_notify"
  | "add_tag"
  | "add_comment"
  | "set_deadline"
  | "require_field"
  | "archive_lead";

export type TriggerMode = "any" | "all";

export interface TriggerConfig {
  type: TriggerType;
  config: Record<string, unknown>;
}
export interface ActionConfig {
  type: ActionType;
  config: Record<string, unknown>;
}

export interface AutomationRuleRow {
  id: string;
  workspace_id: string;
  board_id?: string | null;
  kind?: "automation" | "notification" | null;
  cooldown_seconds?: number | null;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  trigger_mode?: TriggerMode;
  triggers?: TriggerConfig[];
  actions?: ActionConfig[];
  is_active: boolean;
  last_error?: string | null;
  paused_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationRunRow {
  id: string;
  rule_id: string;
  lead_id?: string | null;
  trigger_type?: string | null;
  status: string;
  message?: string | null;
  created_at: string;
}

export interface TriggerDraft {
  id: string;
  type: TriggerType;
  column_id: string;
  field: string;
  operator: "changed" | "set_to" | "contains";
  value: string;
  min_intent_percent: string;
  min_silence_days: string;
  schedule_frequency: "hourly" | "daily" | "weekly";
  schedule_time: string;
  schedule_weekday: string;
}

export interface ActionDraft {
  id: string;
  type: ActionType;
  column_id: string;
  operator_id: string;
  field: string;
  field_value: string;
  sms_message: string;
  sms_to: "lead" | "custom";
  sms_phone: string;
  notify_target: string;
  notify_title: string;
  notify_message: string;
  webhook_url: string;
  webhook_message: string;
  telegram_message: string;
  telegram_target: string;
  tag_id: string;
  comment_message: string;
  deadline_days: string;
  required_field: string;
  archive_mode: "archive" | "sold";
}

export interface FormState {
  name: string;
  description: string;
  trigger_mode: TriggerMode;
  triggers: TriggerDraft[];
  actions: ActionDraft[];
  is_active: boolean;
  scope_column_ids: string[];
  scope_operator_id: string;
  scope_search: string;
  cooldown_seconds: string;
}

export interface ColumnOption {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
}
export interface OperatorOption {
  id: string;
  operator_name: string | null;
}
export interface TagOption {
  id: string;
  name: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  lead_added: "New lead added",
  lead_column_change: "Lead moves to a column",
  lead_field_changed: "A field changes",
  lead_signal_threshold: "AI signal threshold",
  schedule: "On a schedule",
  deadline_due: "Deadline due or overdue",
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  move_to_column: "Move to column",
  assign_operator: "Assign operator",
  edit_field: "Edit a field",
  sms_notify: "Send SMS",
  notify_user: "In-app notification",
  send_webhook: "Send webhook",
  telegram_notify: "Telegram notify",
  add_tag: "Add tag",
  add_comment: "Add comment",
  set_deadline: "Set deadline (+ days)",
  require_field: "Require field (popup)",
  archive_lead: "Archive / mark sold",
};

export const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "column_id", label: "Pipeline column" },
  { value: "assigned_operator_id", label: "Assigned operator" },
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "phone_number", label: "Phone" },
  { value: "assigned_to", label: "Assigned user" },
];

export const EMPTY_TRIGGER = (): TriggerDraft => ({
  id: uid(),
  type: "lead_added",
  column_id: "",
  field: "assigned_operator_id",
  operator: "changed",
  value: "",
  min_intent_percent: "75",
  min_silence_days: "",
  schedule_frequency: "daily",
  schedule_time: "09:00",
  schedule_weekday: "1",
});

export const EMPTY_ACTION = (): ActionDraft => ({
  id: uid(),
  type: "move_to_column",
  column_id: "",
  operator_id: "",
  field: "first_name",
  field_value: "",
  sms_message: "",
  sms_to: "lead",
  sms_phone: "",
  notify_target: "assigned_operator",
  notify_title: "Lead automation",
  notify_message: "Lead {{lead.name}} triggered an automation.",
  webhook_url: "",
  webhook_message: "",
  telegram_message: "Operatora: {{lead.name}} — {{lead.column_name}}",
  telegram_target: "workspace_group",
  tag_id: "",
  comment_message: "",
  deadline_days: "1",
  required_field: "deadline",
  archive_mode: "archive",
});

export const EMPTY_FORM = (): FormState => ({
  name: "",
  description: "",
  trigger_mode: "any",
  triggers: [EMPTY_TRIGGER()],
  actions: [EMPTY_ACTION()],
  is_active: true,
  scope_column_ids: [],
  scope_operator_id: "",
  scope_search: "",
  cooldown_seconds: "0",
});

export function buildTriggers(triggers: TriggerDraft[]): TriggerConfig[] {
  return triggers.map((t) => {
    const config: Record<string, unknown> = {};
    if (t.type === "lead_column_change" && t.column_id) config.column_id = t.column_id;
    if (t.type === "lead_field_changed") {
      config.field = t.field;
      config.operator = t.operator;
      if (t.operator !== "changed" && t.value) config.value = t.value;
    }
    if (t.type === "lead_signal_threshold") {
      const intent = Number(t.min_intent_percent);
      if (Number.isFinite(intent) && intent > 0) config.min_intent_score = Math.min(1, Math.max(0, intent / 100));
      const silence = Number(t.min_silence_days);
      if (Number.isFinite(silence) && silence > 0) config.min_silence_days = Math.floor(silence);
    }
    if (t.type === "schedule") {
      config.frequency = t.schedule_frequency;
      config.time = t.schedule_time;
      config.timezone = "Asia/Tashkent";
      if (t.schedule_frequency === "weekly") config.weekday = Number(t.schedule_weekday);
    }
    return { type: t.type, config };
  });
}

export function buildScopeFilter(form: FormState): Record<string, unknown> | null {
  const scope: Record<string, unknown> = {};
  if (form.scope_column_ids.length) scope.column_ids = form.scope_column_ids;
  if (form.scope_operator_id) scope.assigned_operator_id = form.scope_operator_id;
  if (form.scope_search.trim()) scope.search = form.scope_search.trim();
  return Object.keys(scope).length ? scope : null;
}

export function buildActions(actions: ActionDraft[]): ActionConfig[] {
  return actions.map((a) => {
    const config: Record<string, unknown> = {};
    switch (a.type) {
      case "move_to_column":
        if (a.column_id) config.column_id = a.column_id;
        break;
      case "assign_operator":
        if (a.operator_id) config.operator_id = a.operator_id;
        break;
      case "edit_field":
        config.field = a.field;
        config.value = a.field_value;
        break;
      case "sms_notify":
        if (a.sms_message.trim()) config.message = a.sms_message.trim();
        if (a.sms_to === "custom") {
          config.to = "custom";
          config.phone = a.sms_phone.trim();
        }
        break;
      case "notify_user":
        config.user_target = a.notify_target;
        if (a.notify_target && !["assigned_operator", "assigned_to"].includes(a.notify_target)) config.user_id = a.notify_target;
        if (a.notify_title.trim()) config.title = a.notify_title.trim();
        if (a.notify_message.trim()) config.message = a.notify_message.trim();
        break;
      case "send_webhook":
        if (a.webhook_url.trim()) config.url = a.webhook_url.trim();
        if (a.webhook_message.trim()) config.message = a.webhook_message.trim();
        break;
      case "telegram_notify":
        if (a.telegram_message.trim()) config.message = a.telegram_message.trim();
        config.target = a.telegram_target || "workspace_group";
        break;
      case "add_tag":
        if (a.tag_id) config.tag_id = a.tag_id;
        break;
      case "add_comment":
        if (a.comment_message.trim()) config.message = a.comment_message.trim();
        break;
      case "set_deadline": {
        const days = Number(a.deadline_days);
        config.days = Number.isFinite(days) ? Math.trunc(days) : 0;
        break;
      }
      case "require_field":
        if (a.required_field.trim()) config.field = a.required_field.trim();
        break;
      case "archive_lead":
        config.mode = a.archive_mode;
        break;
    }
    return { type: a.type, config };
  });
}

function triggerFromConfig(t: TriggerConfig): TriggerDraft {
  const cfg = t.config ?? {};
  const intent = Number(cfg.min_intent_score);
  return {
    id: uid(),
    type: t.type,
    column_id: (cfg.column_id as string) ?? "",
    field: (cfg.field as string) ?? "assigned_operator_id",
    operator: (cfg.operator as TriggerDraft["operator"]) ?? "changed",
    value: cfg.value != null ? String(cfg.value) : "",
    min_intent_percent: Number.isFinite(intent) && intent > 0 ? String(Math.round(intent * 100)) : "75",
    min_silence_days: cfg.min_silence_days != null ? String(cfg.min_silence_days) : "",
    schedule_frequency: (cfg.frequency as TriggerDraft["schedule_frequency"]) ?? "daily",
    schedule_time: (cfg.time as string) ?? "09:00",
    schedule_weekday: cfg.weekday != null ? String(cfg.weekday) : "1",
  };
}

function actionFromConfig(a: ActionConfig): ActionDraft {
  const cfg = a.config ?? {};
  return {
    id: uid(),
    type: a.type,
    column_id: (cfg.column_id as string) ?? "",
    operator_id: (cfg.operator_id as string) ?? "",
    field: (cfg.field as string) ?? "first_name",
    field_value: cfg.value != null ? String(cfg.value) : "",
    sms_message: (cfg.message as string) ?? "",
    sms_to: (cfg.to as "lead" | "custom") ?? "lead",
    sms_phone: (cfg.phone as string) ?? "",
    notify_target: (cfg.user_target as string) ?? (cfg.user_id as string) ?? "assigned_operator",
    notify_title: (cfg.title as string) ?? "Lead automation",
    notify_message: (cfg.message as string) ?? "Lead {{lead.name}} triggered an automation.",
    webhook_url: (cfg.url as string) ?? "",
    webhook_message: (cfg.message as string) ?? "",
    telegram_message: (cfg.message as string) ?? "Operatora: {{lead.name}}",
    telegram_target: (cfg.target as string) ?? "workspace_group",
    tag_id: (cfg.tag_id as string) ?? "",
    comment_message: (cfg.message as string) ?? "",
    deadline_days: cfg.days != null ? String(cfg.days) : "1",
    required_field: (cfg.field as string) ?? "",
    archive_mode: (cfg.mode as "archive" | "sold") ?? "archive",
  };
}

export function formFromRow(row: AutomationRuleRow): FormState {
  const tc = row.trigger_config ?? {};
  const ac = row.action_config ?? {};
  const triggers =
    Array.isArray(row.triggers) && row.triggers.length
      ? row.triggers.map(triggerFromConfig)
      : Array.isArray(tc.triggers) && (tc.triggers as unknown[]).length
        ? (tc.triggers as TriggerConfig[]).map(triggerFromConfig)
        : [triggerFromConfig({ type: row.trigger_type as TriggerType, config: tc })];
  const actions =
    Array.isArray(row.actions) && row.actions.length
      ? row.actions.map(actionFromConfig)
      : Array.isArray(ac.actions) && (ac.actions as unknown[]).length
        ? (ac.actions as ActionConfig[]).map(actionFromConfig)
        : [actionFromConfig({ type: row.action_type as ActionType, config: ac })];
  const scope = (tc.scope_filter as Record<string, unknown>) ?? {};
  return {
    name: row.name,
    description: row.description ?? "",
    trigger_mode: (row.trigger_mode as TriggerMode) ?? (tc.trigger_mode as TriggerMode) ?? "any",
    triggers,
    actions,
    is_active: row.is_active,
    scope_column_ids: Array.isArray(scope.column_ids) ? (scope.column_ids as string[]) : [],
    scope_operator_id: (scope.assigned_operator_id as string) ?? "",
    scope_search: (scope.search as string) ?? "",
    cooldown_seconds: String(row.cooldown_seconds ?? 0),
  };
}

export function buildRulePayload(
  form: FormState,
  workspaceId: string,
  boardId: string | null = null,
): Record<string, unknown> {
  const triggers = buildTriggers(form.triggers);
  const actions = buildActions(form.actions);
  const triggerConfig = {
    board_id: boardId,
    trigger_mode: form.trigger_mode,
    triggers,
    scope_filter: buildScopeFilter(form),
    ...(triggers[0]?.config ?? {}),
  };
  return {
    workspace_id: workspaceId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    board_id: boardId,
    trigger_mode: form.trigger_mode,
    triggers,
    actions,
    trigger_type: triggers[0]?.type ?? "lead_added",
    trigger_config: triggerConfig,
    action_type: actions[0]?.type ?? "move_to_column",
    action_config: { actions },
    is_active: form.is_active,
    paused_at: null,
    last_error: null,
    kind: "automation",
    cooldown_seconds: Math.max(0, Math.trunc(Number(form.cooldown_seconds) || 0)),
    updated_at: new Date().toISOString(),
  };
}

/**
 * A rule scoped to a specific board (`board_id` set, either on the row
 * itself or — for rows written before the column existed — nested in
 * `trigger_config.board_id`) only matches that board. A workspace-wide rule
 * (`board_id` null on both) matches every board, so it still shows up (and
 * can still be edited) from any board's automations dialog, same as the old
 * frontend's `LeadAutomationsPanel` `boardId` filter.
 */
export function ruleMatchesBoard(row: AutomationRuleRow, boardId: string | null): boolean {
  if (!boardId) return true;
  const scoped = row.board_id ?? (row.trigger_config?.board_id as string | null | undefined);
  return !scoped || scoped === boardId;
}

export function describeTriggers(row: AutomationRuleRow, columns: ColumnOption[]): string {
  const tc = row.trigger_config ?? {};
  const triggers: TriggerConfig[] =
    Array.isArray(row.triggers) && row.triggers.length
      ? row.triggers
      : Array.isArray(tc.triggers) && (tc.triggers as unknown[]).length
        ? (tc.triggers as TriggerConfig[])
        : [{ type: row.trigger_type as TriggerType, config: tc }];
  const parts = triggers.map((t) => {
    const cfg = t.config ?? {};
    if (t.type === "lead_added") return "New lead added";
    if (t.type === "lead_column_change") {
      const col = columns.find((c) => c.id === cfg.column_id);
      return col ? `Moved to «${col.name}»` : "Column changed";
    }
    if (t.type === "lead_field_changed") {
      const field = FIELD_OPTIONS.find((f) => f.value === cfg.field)?.label ?? String(cfg.field ?? "");
      if (cfg.operator === "set_to") return `${field} set to ${cfg.value}`;
      if (cfg.operator === "contains") return `${field} contains "${cfg.value}"`;
      return `${field} changed`;
    }
    if (t.type === "lead_signal_threshold") {
      const bits: string[] = [];
      const intent = Number(cfg.min_intent_score);
      if (Number.isFinite(intent) && intent > 0) bits.push(`intent ≥ ${Math.round(intent * 100)}%`);
      const silence = Number(cfg.min_silence_days);
      if (Number.isFinite(silence) && silence > 0) bits.push(`silence ≥ ${silence}d`);
      return bits.length ? `AI signal: ${bits.join(", ")}` : "AI signal";
    }
    if (t.type === "schedule") return `Every ${cfg.frequency ?? "daily"} at ${cfg.time ?? "09:00"}`;
    if (t.type === "deadline_due") return "Lead deadline due or overdue";
    return t.type;
  });
  const mode = (row.trigger_mode ?? tc.trigger_mode) === "all" ? "ALL" : "ANY";
  return parts.length > 1 ? `${mode}: ${parts.join(" · ")}` : (parts[0] ?? "—");
}

export function describeActions(row: AutomationRuleRow, columns: ColumnOption[], operators: OperatorOption[]): string {
  const ac = row.action_config ?? {};
  const actions: ActionConfig[] =
    Array.isArray(row.actions) && row.actions.length
      ? row.actions
      : Array.isArray(ac.actions) && (ac.actions as unknown[]).length
        ? (ac.actions as ActionConfig[])
        : [{ type: row.action_type as ActionType, config: ac }];
  return actions
    .map((a) => {
      const cfg = a.config ?? {};
      switch (a.type) {
        case "move_to_column": {
          const col = columns.find((c) => c.id === cfg.column_id);
          return col ? `Move to «${col.name}»` : "Move column";
        }
        case "assign_operator": {
          const op = operators.find((o) => o.id === cfg.operator_id);
          return op?.operator_name ? `Assign ${op.operator_name}` : "Assign operator";
        }
        case "edit_field":
          return `Edit ${cfg.field ?? "field"}`;
        case "sms_notify":
          return "Send SMS";
        case "notify_user":
          return "In-app notification";
        case "require_field":
          return cfg.field ? `Require «${cfg.field}» (popup)` : "Require field (popup)";
        case "send_webhook":
          return "Send webhook";
        case "telegram_notify":
          return "Telegram notify";
        case "add_tag":
          return "Add tag";
        case "add_comment":
          return "Add comment";
        case "set_deadline":
          return "Set deadline";
        case "archive_lead":
          return cfg.mode === "sold" ? "Mark as sold" : "Archive lead";
        default:
          return a.type;
      }
    })
    .join(" → ");
}

export function validateForm(form: FormState): string | null {
  if (!form.name.trim()) return "Rule name is required";
  if (!form.triggers.length) return "Add at least one trigger";
  if (!form.actions.length) return "Add at least one action";
  for (const t of form.triggers) {
    if (t.type === "lead_column_change" && !t.column_id) return "Select a trigger column";
    if (t.type === "lead_field_changed" && t.operator !== "changed" && !t.value.trim()) return "Enter a trigger value";
    if (t.type === "schedule" && !t.schedule_time.trim()) return "Enter schedule time (HH:mm)";
  }
  for (const a of form.actions) {
    if (a.type === "move_to_column" && !a.column_id) return "Select a target column";
    if (a.type === "assign_operator" && !a.operator_id) return "Select an operator";
    if (a.type === "send_webhook" && !a.webhook_url.trim()) return "Webhook URL is required";
    if (a.type === "require_field" && !a.required_field.trim()) return "Select a required field";
    if (a.type === "add_tag" && !a.tag_id) return "Select a tag";
    if (a.type === "add_comment" && !a.comment_message.trim()) return "Enter a comment";
  }
  return null;
}

export function isPaused(row: AutomationRuleRow): boolean {
  const meta = (row.trigger_config?._meta as Record<string, unknown>) ?? {};
  return !!(row.paused_at ?? meta.paused_at);
}

export function pauseError(row: AutomationRuleRow): string | undefined {
  const meta = (row.trigger_config?._meta as Record<string, unknown>) ?? {};
  return (row.last_error ?? meta.last_error) as string | undefined;
}

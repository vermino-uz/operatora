/**
 * Task Management settings — traced from the old frontend's
 * `TaskModuleSettings.tsx`/`TaskModuleRulesEditor.tsx` (`lib/taskRules.ts`),
 * against the real `tasks.controller.ts`'s `GET/PUT /tasks/settings`
 * (`TaskSettingsService`, workspace-manager-gated server-side via
 * `canManageTeamTasks`). This is NOT the Tasks app feature itself
 * (`operator_tasks` CRUD, `GET/POST /tasks`, `PATCH /tasks/:id/complete`)
 * — that's a separate, not-yet-built protected route (see PROGRESS.md).
 * This section only configures *when the app should prompt/require/
 * auto-create a follow-up task* as a lead moves through the pipeline —
 * the exact same shape the backend's `task-rules.util.ts` validates,
 * ported 1:1 so client-side defaults/validation never drift from what the
 * server will normalize anyway.
 */

export type TaskRuleTrigger = "lead_column_change" | "lead_created" | "lead_assigned" | "lead_saved";

export type TaskRuleAction = "prompt_task" | "require_task" | "auto_create_task";

export type TaskDuePreset = "today" | "tomorrow" | "in_3_days";

export interface TaskRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TaskRuleTrigger;
  action: TaskRuleAction;
  /** For lead_column_change — empty means all columns. */
  column_ids: string[];
  task_type: string;
  due_preset: TaskDuePreset;
  title_template: string;
}

export interface TaskModuleSettings {
  enabled: boolean;
  rules: TaskRule[];
}

export const TASK_RULE_TRIGGERS: TaskRuleTrigger[] = ["lead_column_change", "lead_created", "lead_assigned", "lead_saved"];
export const TASK_RULE_ACTIONS: TaskRuleAction[] = ["prompt_task", "require_task", "auto_create_task"];
export const TASK_RULE_TYPES = ["call", "send_info", "meeting", "check_payment", "custom"];
export const TASK_DUE_PRESETS: TaskDuePreset[] = ["today", "tomorrow", "in_3_days"];

export const TRIGGER_LABELS: Record<TaskRuleTrigger, string> = {
  lead_column_change: "Lead moves to a pipeline column",
  lead_created: "New lead created",
  lead_assigned: "Lead assigned to an operator",
  lead_saved: "Lead saved (any edit)",
};

export const ACTION_LABELS: Record<TaskRuleAction, string> = {
  prompt_task: "Prompt the operator to create a task",
  require_task: "Require a task before continuing",
  auto_create_task: "Automatically create a task",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  send_info: "Send info",
  meeting: "Meeting",
  check_payment: "Check payment",
  custom: "Custom",
};

export const DUE_PRESET_LABELS: Record<TaskDuePreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  in_3_days: "In 3 days",
};

export const DEFAULT_TASK_MODULE_SETTINGS: TaskModuleSettings = { enabled: false, rules: [] };

function newRuleId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultTitleForTrigger(trigger: TaskRuleTrigger): string {
  switch (trigger) {
    case "lead_column_change":
      return "Follow up: {lead_name}";
    case "lead_created":
      return "Contact new lead: {lead_name}";
    case "lead_assigned":
      return "Work assigned lead: {lead_name}";
    case "lead_saved":
      return "Next step: {lead_name}";
    default:
      return "Task: {lead_name}";
  }
}

export function createEmptyTaskRule(partial?: Partial<TaskRule>): TaskRule {
  const trigger = partial?.trigger ?? "lead_column_change";
  return {
    id: partial?.id ?? newRuleId(),
    name: partial?.name ?? "",
    enabled: partial?.enabled ?? true,
    trigger,
    action: partial?.action ?? "prompt_task",
    column_ids: partial?.column_ids ?? [],
    task_type: partial?.task_type ?? "call",
    due_preset: partial?.due_preset ?? "tomorrow",
    title_template: partial?.title_template ?? defaultTitleForTrigger(trigger),
  };
}

function sanitizeRule(raw: unknown): TaskRule | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const trigger = String(o.trigger ?? "");
  const action = String(o.action ?? "");
  if (!TASK_RULE_TRIGGERS.includes(trigger as TaskRuleTrigger)) return null;
  if (!TASK_RULE_ACTIONS.includes(action as TaskRuleAction)) return null;
  const taskType = String(o.task_type ?? "call");
  const duePreset = String(o.due_preset ?? "tomorrow");
  return {
    id: typeof o.id === "string" && o.id ? o.id : newRuleId(),
    name: typeof o.name === "string" ? o.name.slice(0, 120) : "",
    enabled: o.enabled !== false,
    trigger: trigger as TaskRuleTrigger,
    action: action as TaskRuleAction,
    column_ids: Array.isArray(o.column_ids) ? o.column_ids.filter((id): id is string => typeof id === "string") : [],
    task_type: TASK_RULE_TYPES.includes(taskType) ? taskType : "custom",
    due_preset: TASK_DUE_PRESETS.includes(duePreset as TaskDuePreset) ? (duePreset as TaskDuePreset) : "tomorrow",
    title_template:
      typeof o.title_template === "string" && o.title_template.trim()
        ? o.title_template.slice(0, 200)
        : defaultTitleForTrigger(trigger as TaskRuleTrigger),
  };
}

export function normalizeTaskModuleSettings(raw: unknown): TaskModuleSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TASK_MODULE_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const enabled = obj.enabled === true;
  const rules = Array.isArray(obj.rules) ? obj.rules.map(sanitizeRule).filter((r): r is TaskRule => r !== null) : [];
  return { enabled, rules };
}

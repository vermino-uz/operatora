/**
 * Standalone Tasks app page (`/tasks`) — the real operator-facing
 * `operator_tasks` CRUD (`GET/POST /tasks`, `PATCH /tasks/:id/complete`,
 * `GET /tasks/assignees`), traced directly from
 * `/www/wwwroot/dev.operatora/app/backend/src/tasks/{tasks.controller,
 * tasks.service}.ts` — NOT the same as `features/tasks-settings/` (that's
 * `GET/PUT /tasks/settings`, the workspace-wide automation *rules* config
 * for when the app should prompt/require/auto-create a task; this feature
 * is the actual day-to-day task list operators work from). Types below are
 * a hand-written mirror of `OperatorTaskRow`/the controller's real request/
 * response shapes — this controller uses `@Body() body: unknown` (no DTO
 * class), so nothing here comes from generated types, per ARCHITECTURE.md's
 * "~11 controllers use untyped body" finding.
 */

export type OperatorTaskType = "call" | "send_info" | "meeting" | "check_payment" | "custom" | "system";

/** Matches `tasks.service.ts`'s allowed values exactly (`create()`'s
 * `allowedTypes` array) — "system" is server-writable only (auto-created by
 * a task rule / the overdue sweep), never offered in the create form. */
export const CREATABLE_TASK_TYPES: OperatorTaskType[] = ["call", "send_info", "meeting", "check_payment", "custom"];

export type OperatorTaskStatus = "pending" | "completed" | "cancelled";

export type OperatorTaskSource = "operator" | "manager" | "system";

export interface OperatorTaskLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
}

export interface OperatorTask {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  assigned_operator_id: string | null;
  created_by: string;
  title: string;
  task_type: string;
  source: string;
  status: string;
  due_at: string;
  completed_at: string | null;
  closure_comment: string | null;
  created_at: string;
  updated_at: string;
  /** Server-computed (`status === 'pending' && due_at < now`), not derived
   * client-side — trust it over re-deriving from `due_at` alone since the
   * server's `now` is authoritative. */
  is_overdue?: boolean;
  leads?: OperatorTaskLead | null;
}

export type TaskScope = "mine" | "team";

export type TaskBucket = "overdue" | "today" | "upcoming" | "completed";

/** Ported 1:1 from the old frontend's `lib/operatorTasksApi.ts`'s
 * `bucketTask()` — same day-boundary logic (local midnight, not UTC). */
export function bucketTask(task: OperatorTask, now = new Date()): TaskBucket {
  if (task.status === "completed") return "completed";
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return "upcoming";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (due.getTime() < startOfToday.getTime()) return "overdue";
  if (due.getTime() < startOfTomorrow.getTime()) return "today";
  return "upcoming";
}

export interface TaskAssignee {
  id: string;
  operator_name: string | null;
  profile_id: string | null;
  is_active?: boolean;
}

export interface CreateTaskInput {
  title: string;
  task_type?: string;
  due_at: string;
  lead_id?: string | null;
  assigned_to?: string | null;
  assigned_operator_id?: string | null;
  source?: string;
}

export type TaskDuePreset = "today" | "tomorrow" | "in_3_days" | "custom";

/** Ported 1:1 from the old frontend's `CreateTaskDialog.tsx`'s
 * `dueFromPreset()`. */
export function dueFromPreset(preset: TaskDuePreset, customIso?: string): string {
  if (preset === "custom" && customIso) return new Date(customIso).toISOString();
  const base = new Date();
  if (preset === "today") {
    base.setHours(18, 0, 0, 0);
    if (base.getTime() <= Date.now()) base.setDate(base.getDate() + 1);
  } else if (preset === "tomorrow") {
    base.setDate(base.getDate() + 1);
    base.setHours(10, 0, 0, 0);
  } else {
    base.setDate(base.getDate() + 3);
    base.setHours(10, 0, 0, 0);
  }
  return base.toISOString();
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  send_info: "Send info",
  meeting: "Meeting",
  check_payment: "Check payment",
  custom: "Custom",
  system: "System",
};

export function taskTypeLabel(type: string): string {
  return TASK_TYPE_LABELS[type] ?? type;
}

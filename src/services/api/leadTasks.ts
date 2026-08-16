import { apiFetch } from "@/services/api/client";
import type { LeadTask, LeadTaskType } from "@/features/leads/types";

/**
 * Lead Tasks tab (Phase 2c-4) — `tasks.controller.ts`/`tasks.service.ts`
 * (`src/tasks/`), a real, already-live `operator_tasks` CRUD surface (this
 * app had no data layer for it yet — only `features/tasks-settings/` for
 * the workspace automation *config*, a different service). `GET
 * /tasks?lead_id=` returns the full task history for the lead regardless of
 * assignee/status (confirmed directly in `tasks.controller.ts`'s own
 * summary), distinct from the assignee-scoped `?scope=mine|team` used
 * elsewhere in that same endpoint (not this tab's concern).
 */
export const leadTasksApi = {
  async listForLead(leadId: string): Promise<LeadTask[]> {
    const res = await apiFetch<{ tasks: LeadTask[] }>(`/tasks?lead_id=${encodeURIComponent(leadId)}`);
    return res.tasks ?? [];
  },

  /** `GET /tasks/assignees` — active operators eligible as a task assignee.
   * Assigning to anyone other than yourself 403s server-side unless the
   * caller is a manager (enforced in `tasks.service.ts`'s `create()`) —
   * surfaced as a normal inline error, not pre-checked client-side. */
  async listAssignees(): Promise<{ id: string; operator_name: string; profile_id: string | null }[]> {
    const res = await apiFetch<{ operators: { id: string; operator_name: string; profile_id: string | null }[] }>(
      `/tasks/assignees`,
    );
    return res.operators ?? [];
  },

  async create(payload: {
    title: string;
    task_type: LeadTaskType;
    due_at: string;
    lead_id: string;
    assigned_operator_id?: string | null;
  }): Promise<LeadTask> {
    return apiFetch<LeadTask>(`/tasks`, { method: "POST", body: payload });
  },

  async complete(taskId: string, closureComment?: string): Promise<LeadTask> {
    return apiFetch<LeadTask>(`/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: "PATCH",
      body: { closure_comment: closureComment ?? "" },
    });
  },
};

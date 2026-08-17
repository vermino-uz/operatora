import { apiFetch } from "@/services/api/client";
import type { CreateTaskInput, OperatorTask, TaskAssignee, TaskScope } from "@/features/tasks/types";

/**
 * `tasks.controller.ts`'s `operator_tasks` CRUD — the standalone Tasks app
 * page's data source (distinct from `services/api/taskSettings.ts`, the
 * automation-rules config). Workspace derived purely from the JWT, no
 * `workspace_id` param anywhere on this controller (confirmed directly in
 * `tasks.service.ts` — every query keys off `user.workspaceId`).
 */
export const tasksApi = {
  /** `GET /tasks?scope=mine|team` — "mine" = assigned to the caller
   * (`assigned_to` or the caller's own `operator_id`), "team" = every
   * workspace task, manager-gated server-side (`canManageTeamTasks`, a
   * silent no-op fallback to "mine" server-side if the caller isn't a
   * manager — this app also hides the Team toggle client-side, see
   * `TasksPage`). */
  async list(scope: TaskScope = "mine"): Promise<OperatorTask[]> {
    const data = await apiFetch<{ tasks?: OperatorTask[] }>(`/tasks?scope=${scope}`);
    return Array.isArray(data?.tasks) ? data.tasks : [];
  },

  /** `GET /tasks/assignees` — active operators in the workspace, for the
   * manager-only "assign to" picker on create. */
  async assignees(): Promise<TaskAssignee[]> {
    const data = await apiFetch<{ operators?: TaskAssignee[] }>("/tasks/assignees");
    return Array.isArray(data?.operators) ? data.operators : [];
  },

  /** `POST /tasks` — server 403s (`ForbiddenException`) if a non-manager
   * tries to assign to someone else; surfaced as a normal inline error,
   * not pre-blocked beyond hiding the assignee picker for non-managers. */
  async create(input: CreateTaskInput): Promise<OperatorTask> {
    return apiFetch<OperatorTask>("/tasks", { method: "POST", body: input });
  },

  /** `PATCH /tasks/:id/complete` — `closure_comment` is server-mandatory
   * (`TasksService.complete()` 400s on an empty/missing comment). */
  async complete(id: string, closureComment: string): Promise<OperatorTask> {
    return apiFetch<OperatorTask>(`/tasks/${id}/complete`, {
      method: "PATCH",
      body: { closure_comment: closureComment },
    });
  },
};

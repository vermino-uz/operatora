import { apiFetch } from "@/services/api/client";
import type {
  CreateOperatorInput,
  TeamMemberRow,
  TeamMembersFilters,
  UpdateOperatorInput,
} from "@/features/team/types";

/** `GET /admin-users/operators` returns a bare array (no pagination
 * envelope) — confirmed via the backend service's `.map()` return and the
 * old frontend's own `useQuery<OperatorRow[]>`. */
export const teamApi = {
  async list(workspaceId: string, filters: TeamMembersFilters = {}): Promise<TeamMemberRow[]> {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    return apiFetch<TeamMemberRow[]>(`/admin-users/operators?${params.toString()}`);
  },

  /** The create/update responses are narrower, ad-hoc shapes (not a full
   * `TeamMemberRow` — e.g. create returns `{user_id, operator_id, email,
   * full_name, workspace_id, role, permissions}`, update returns only the
   * fields it actually changed) per the backend service's return
   * statements. Callers rely on invalidating the list query afterward
   * rather than reading these responses directly. */
  async invite(workspaceId: string, input: CreateOperatorInput): Promise<{ user_id: string }> {
    return apiFetch<{ user_id: string }>(`/admin-users/operators`, {
      method: "POST",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async update(workspaceId: string, userId: string, input: UpdateOperatorInput): Promise<{ user_id: string }> {
    return apiFetch<{ user_id: string }>(`/admin-users/operators/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async remove(workspaceId: string, userId: string): Promise<void> {
    await apiFetch<{ success: true }>(
      `/admin-users/operators/${encodeURIComponent(userId)}?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
  },
};

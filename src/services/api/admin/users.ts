import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type {
  ImpersonationResponse,
  UpdateUserPatch,
  UserDetail,
  UsersFilters,
  UsersListResponse,
  UserSessionRow,
} from "@/features/admin/types";

/** `/admin/users/*` — confirmed against `admin-users.controller.ts`. */
export const adminUsersApi = {
  list(filters: UsersFilters): Promise<UsersListResponse> {
    return apiFetch<UsersListResponse>(`/admin/users${buildAdminQuery(filters)}`);
  },
  get(id: string): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(id)}`);
  },
  update(id: string, patch: UpdateUserPatch): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
  },
  remove(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  sessions(id: string): Promise<{ rows: UserSessionRow[] }> {
    return apiFetch<{ rows: UserSessionRow[] }>(`/admin/users/${encodeURIComponent(id)}/sessions`);
  },
  revokeAllSessions(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/admin/users/${encodeURIComponent(id)}/sessions/revoke-all`, {
      method: "POST",
      body: {},
    });
  },
  revokeSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(
      `/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/revoke`,
      { method: "POST", body: {} },
    );
  },
  lock(id: string, reason?: string): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(id)}/lock`, {
      method: "POST",
      body: { reason: reason ?? null },
    });
  },
  unlock(id: string): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(id)}/unlock`, { method: "POST", body: {} });
  },
  addRole(userId: string, role: string): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(userId)}/roles`, {
      method: "POST",
      body: { role },
    });
  },
  removeRole(userId: string, role: string): Promise<UserDetail> {
    return apiFetch<UserDetail>(`/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`, {
      method: "DELETE",
    });
  },
  impersonate(userId: string): Promise<ImpersonationResponse> {
    return apiFetch<ImpersonationResponse>(`/admin/impersonate/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: {},
    });
  },
};

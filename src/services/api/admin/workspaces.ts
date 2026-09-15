import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type {
  UpdateWorkspacePatch,
  WorkspaceBillingDetail,
  WorkspaceConversationRow,
  WorkspaceDetail,
  WorkspaceEntitlements,
  WorkspaceEntitlementsPatch,
  WorkspaceIntegrationsHealth,
  WorkspaceLeadRow,
  WorkspacesFilters,
  WorkspacesListResponse,
  WorkspaceUserRow,
} from "@/features/admin/types";

/**
 * `/admin/workspaces/*` — confirmed against `admin-workspaces.controller.ts`
 * + `admin-workspace-detail.service.ts` (both real, `SuperAdminGuard`-gated).
 */
export const adminWorkspacesApi = {
  list(filters: WorkspacesFilters): Promise<WorkspacesListResponse> {
    return apiFetch<WorkspacesListResponse>(`/admin/workspaces${buildAdminQuery(filters)}`);
  },
  get(id: string): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}`);
  },
  update(id: string, patch: UpdateWorkspacePatch): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
    });
  },
  suspend(id: string, reason?: string): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/suspend`, {
      method: "POST",
      body: { reason: reason ?? null },
    });
  },
  reactivate(id: string): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/reactivate`, {
      method: "POST",
      body: {},
    });
  },
  extendTrial(id: string, days: number): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/extend-trial`, {
      method: "POST",
      body: { days },
    });
  },
  extendSubscription(id: string, days: number): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/extend-subscription`, {
      method: "POST",
      body: { days },
    });
  },
  expireTariff(id: string): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/expire-tariff`, {
      method: "POST",
      body: {},
    });
  },
  revokeTariff(id: string): Promise<WorkspaceDetail> {
    return apiFetch<WorkspaceDetail>(`/admin/workspaces/${encodeURIComponent(id)}/revoke-tariff`, {
      method: "POST",
      body: {},
    });
  },
  remove(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/admin/workspaces/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  entitlements(id: string): Promise<WorkspaceEntitlements | null> {
    return apiFetch<WorkspaceEntitlements | null>(`/admin/workspaces/${encodeURIComponent(id)}/entitlements`);
  },
  updateEntitlements(id: string, patch: WorkspaceEntitlementsPatch): Promise<WorkspaceEntitlements> {
    return apiFetch<WorkspaceEntitlements>(`/admin/workspaces/${encodeURIComponent(id)}/entitlements`, {
      method: "PATCH",
      body: patch,
    });
  },
  users(id: string): Promise<{ rows: WorkspaceUserRow[] }> {
    return apiFetch<{ rows: WorkspaceUserRow[] }>(`/admin/workspaces/${encodeURIComponent(id)}/users`);
  },
  leads(id: string, page = 1, perPage = 50): Promise<{ rows: WorkspaceLeadRow[]; total: number; page: number; perPage: number }> {
    return apiFetch(`/admin/workspaces/${encodeURIComponent(id)}/leads${buildAdminQuery({ page, perPage })}`);
  },
  conversations(
    id: string,
    page = 1,
    perPage = 50,
  ): Promise<{ rows: WorkspaceConversationRow[]; total: number; page: number; perPage: number }> {
    return apiFetch(`/admin/workspaces/${encodeURIComponent(id)}/conversations${buildAdminQuery({ page, perPage })}`);
  },
  integrations(id: string): Promise<WorkspaceIntegrationsHealth> {
    return apiFetch<WorkspaceIntegrationsHealth>(`/admin/workspaces/${encodeURIComponent(id)}/integrations`);
  },
  billing(id: string): Promise<WorkspaceBillingDetail> {
    return apiFetch<WorkspaceBillingDetail>(`/admin/workspaces/${encodeURIComponent(id)}/billing`);
  },
};

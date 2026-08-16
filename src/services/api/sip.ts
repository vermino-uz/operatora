import { apiFetch } from "@/services/api/client";
import type { OperatorSipAccount, UpsertOperatorSipInput } from "@/features/team/types";

/**
 * Per-operator SIP telephony accounts — traced from the old frontend's
 * `WorkspaceSipAccountsPanel.tsx` against
 * `admin-users.controller.ts`'s `operators/:userId/sip*` routes. Multiple
 * accounts per operator, exactly one may be `is_active`.
 */
export const sipApi = {
  async list(workspaceId: string, userId: string): Promise<OperatorSipAccount[]> {
    const data = await apiFetch<OperatorSipAccount[] | OperatorSipAccount>(
      `/admin-users/operators/${encodeURIComponent(userId)}/sip?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(data) ? data : data ? [data] : [];
  },

  async upsert(workspaceId: string, userId: string, input: UpsertOperatorSipInput): Promise<{ id: string; success: true; is_active: boolean }> {
    return apiFetch(`/admin-users/operators/${encodeURIComponent(userId)}/sip`, {
      method: "POST",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async activate(workspaceId: string, userId: string, sipId: string): Promise<{ id: string; success: true; is_active: boolean }> {
    return apiFetch(
      `/admin-users/operators/${encodeURIComponent(userId)}/sip/${encodeURIComponent(sipId)}/activate?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "POST" },
    );
  },

  async remove(workspaceId: string, userId: string, sipId: string): Promise<void> {
    await apiFetch<{ success: true }>(
      `/admin-users/operators/${encodeURIComponent(userId)}/sip/${encodeURIComponent(sipId)}?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
  },
};

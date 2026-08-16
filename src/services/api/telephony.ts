import { apiFetch } from "@/services/api/client";
import type {
  WorkspaceGsmTelephonyMember,
  WorkspaceSipTelephonyMember,
} from "@/features/telephony/types";

/**
 * Workspace-wide telephony rosters ("SIP Configuration" / "GSM Lines"
 * settings sections) — see `features/telephony/types.ts` for the full
 * contract-tracing note. Both routes live on `admin-users.controller.ts`,
 * not a dedicated telephony controller.
 */
export const telephonyApi = {
  async listSip(workspaceId: string): Promise<WorkspaceSipTelephonyMember[]> {
    const data = await apiFetch<WorkspaceSipTelephonyMember[]>(
      `/admin-users/workspace-telephony/sip?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(data) ? data : [];
  },

  async listGsm(workspaceId: string): Promise<WorkspaceGsmTelephonyMember[]> {
    const data = await apiFetch<WorkspaceGsmTelephonyMember[]>(
      `/admin-users/workspace-telephony/gsm?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(data) ? data : [];
  },
};

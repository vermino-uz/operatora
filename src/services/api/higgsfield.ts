import { apiFetch } from "@/services/api/client";
import type { HiggsfieldBalance, HiggsfieldStatus } from "@/features/higgsfield/types";

const ws = (workspaceId: string) => `workspace_id=${encodeURIComponent(workspaceId)}`;

/** `/higgsfield/*` — see `features/higgsfield/types.ts` for the confirmed
 * contract traced from `higgsfield.controller.ts`. Job polling/ack (used by
 * AI Chat's generation flow) is intentionally not exposed here. */
export const higgsfieldApi = {
  async status(workspaceId: string): Promise<HiggsfieldStatus> {
    return apiFetch(`/higgsfield/status?${ws(workspaceId)}`);
  },

  async connect(workspaceId: string, language: string): Promise<{ authorizeUrl: string }> {
    return apiFetch(`/higgsfield/connect?${ws(workspaceId)}`, {
      method: "POST",
      body: { language },
    });
  },

  async disconnect(workspaceId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/higgsfield/disconnect?${ws(workspaceId)}`, { method: "POST" });
  },

  async balance(workspaceId: string): Promise<HiggsfieldBalance> {
    return apiFetch(`/higgsfield/balance?${ws(workspaceId)}`);
  },
};

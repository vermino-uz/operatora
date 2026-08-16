import { apiFetch } from "@/services/api/client";
import type { WorkspacePresenceMap } from "@/features/team/types";

/** `GET /presence/workspace` — traced from `useWorkspacePresence.ts` /
 * `presence.controller.ts`. Gated server-side to owner/admin/manager/
 * sales_manager roles (403 for anyone else); the client only calls this
 * when {@link VIEW_PRESENCE_ROLES} already says the caller qualifies. */
export const presenceApi = {
  async workspace(workspaceId: string): Promise<WorkspacePresenceMap> {
    const data = await apiFetch<{ workspace_id: string; members: WorkspacePresenceMap }>(
      `/presence/workspace?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return data.members ?? {};
  },
};

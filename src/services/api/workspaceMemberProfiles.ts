import { apiFetch } from "@/services/api/client";

export interface WorkspaceMemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** `GET /workspace-member-profiles` — display names for message sender ids. */
export const workspaceMemberProfilesApi = {
  async list(workspaceId: string, ids: string[]): Promise<WorkspaceMemberProfile[]> {
    if (!ids.length) return [];
    const qs = new URLSearchParams({
      workspace_id: workspaceId,
      ids: ids.join(","),
    });
    const data = await apiFetch<WorkspaceMemberProfile[]>(`/workspace-member-profiles?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },
};

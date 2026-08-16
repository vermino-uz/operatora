import { apiFetch } from "@/services/api/client";
import type {
  SuperAgentCredential,
  SuperAgentSettings,
  SuperAgentTask,
  SuperAgentTaskEvent,
} from "@/features/super-agent/types";

const ws = (workspaceId: string) => `workspace_id=${encodeURIComponent(workspaceId)}`;

/** `/super-agent/*` — see `features/super-agent/types.ts` for the confirmed
 * contract traced from `super-agent.controller.ts`. */
export const superAgentApi = {
  async getSettings(workspaceId: string): Promise<SuperAgentSettings> {
    return apiFetch(`/super-agent/settings?${ws(workspaceId)}`);
  },

  async setEnabled(workspaceId: string, enabled: boolean): Promise<SuperAgentSettings> {
    return apiFetch("/super-agent/settings", {
      method: "PUT",
      body: { workspace_id: workspaceId, enabled },
    });
  },

  async listCredentials(workspaceId: string): Promise<SuperAgentCredential[]> {
    const body = await apiFetch<{ credentials: SuperAgentCredential[] }>(
      `/super-agent/credentials?${ws(workspaceId)}`,
    );
    return body.credentials ?? [];
  },

  async createCredential(
    workspaceId: string,
    input: {
      service: string;
      label: string;
      login_url?: string;
      username: string;
      password: string;
      extra?: Record<string, unknown>;
    },
  ): Promise<SuperAgentCredential> {
    return apiFetch("/super-agent/credentials", {
      method: "POST",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async deleteCredential(workspaceId: string, id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/super-agent/credentials/${encodeURIComponent(id)}?${ws(workspaceId)}`, {
      method: "DELETE",
    });
  },

  async listTasks(workspaceId: string, limit = 30): Promise<SuperAgentTask[]> {
    const body = await apiFetch<{ tasks: SuperAgentTask[] }>(
      `/super-agent/tasks?${ws(workspaceId)}&limit=${limit}`,
    );
    return body.tasks ?? [];
  },

  async getTask(workspaceId: string, id: string): Promise<{ task: SuperAgentTask; events: SuperAgentTaskEvent[] }> {
    return apiFetch(`/super-agent/tasks/${encodeURIComponent(id)}?${ws(workspaceId)}`);
  },

  async answerTask(workspaceId: string, id: string, answer: string): Promise<SuperAgentTask> {
    return apiFetch(`/super-agent/tasks/${encodeURIComponent(id)}/answer`, {
      method: "POST",
      body: { workspace_id: workspaceId, answer },
    });
  },

  async cancelTask(workspaceId: string, id: string): Promise<SuperAgentTask> {
    return apiFetch(`/super-agent/tasks/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: { workspace_id: workspaceId },
    });
  },
};

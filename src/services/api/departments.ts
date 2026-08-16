import { apiFetch } from "@/services/api/client";
import type {
  DepartmentInput,
  DepartmentMember,
  DepartmentMemberInput,
  GroupVerifyCode,
  RefinedRoutingPrompt,
  TestNotifyResult,
  WorkspaceDepartment,
  WorkspaceGroupStatus,
} from "@/features/departments/types";

/**
 * `/departments/*` — no `workspace_id` param anywhere (unlike chat/
 * conversations/brand): the backend derives the workspace purely from the
 * JWT (`user.workspaceId`) for every route here, confirmed by reading
 * `department.controller.ts` directly — this module deliberately does not
 * follow the "always send workspace_id explicitly" convention because
 * there is no query param for it to go on.
 */
export const departmentsApi = {
  async list(): Promise<WorkspaceDepartment[]> {
    return apiFetch<WorkspaceDepartment[]>("/departments");
  },

  async getBotUsername(): Promise<{ bot_username: string | null }> {
    return apiFetch<{ bot_username: string | null }>("/departments/bot-username");
  },

  async create(input: DepartmentInput): Promise<WorkspaceDepartment> {
    return apiFetch<WorkspaceDepartment>("/departments", { method: "POST", body: input });
  },

  async update(id: string, patch: Partial<DepartmentInput>): Promise<WorkspaceDepartment> {
    return apiFetch<WorkspaceDepartment>(`/departments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
    });
  },

  async remove(id: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(`/departments/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async addMember(departmentId: string, input: DepartmentMemberInput): Promise<DepartmentMember> {
    return apiFetch<DepartmentMember>(`/departments/${encodeURIComponent(departmentId)}/members`, {
      method: "POST",
      body: input,
    });
  },

  async updateMember(
    departmentId: string,
    memberId: string,
    patch: Partial<DepartmentMemberInput>,
  ): Promise<DepartmentMember> {
    return apiFetch<DepartmentMember>(
      `/departments/${encodeURIComponent(departmentId)}/members/${encodeURIComponent(memberId)}`,
      { method: "PATCH", body: patch },
    );
  },

  async removeMember(departmentId: string, memberId: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(
      `/departments/${encodeURIComponent(departmentId)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    );
  },

  async getWorkspaceGroup(): Promise<WorkspaceGroupStatus> {
    return apiFetch<WorkspaceGroupStatus>("/departments/workspace-group");
  },

  async generateWorkspaceGroupVerifyCode(): Promise<GroupVerifyCode> {
    return apiFetch<GroupVerifyCode>("/departments/workspace-group/verify-code", { method: "POST" });
  },

  async refineRoutingPrompt(id: string, routingPrompt: string): Promise<RefinedRoutingPrompt> {
    return apiFetch<RefinedRoutingPrompt>(`/departments/${encodeURIComponent(id)}/refine-routing-prompt`, {
      method: "POST",
      body: { routing_prompt: routingPrompt },
    });
  },

  async sendTestMessage(id: string): Promise<TestNotifyResult> {
    return apiFetch<TestNotifyResult>(`/departments/${encodeURIComponent(id)}/test-notify`, { method: "POST" });
  },
};

import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { AdminSystemHealth, AiInstructionPatch, AiInstructionRow, MobileAppInfo } from "@/features/admin/types";

/** `/admin/system/*` — confirmed against `admin-system.controller.ts`. */
export const adminSystemApi = {
  health(): Promise<AdminSystemHealth> {
    return apiFetch<AdminSystemHealth>("/admin/system/health");
  },
  appInfo(): Promise<MobileAppInfo> {
    return apiFetch<MobileAppInfo>("/admin/system/app-info");
  },
  updateAppInfo(body: MobileAppInfo): Promise<MobileAppInfo> {
    return apiFetch<MobileAppInfo>("/admin/system/app-info", { method: "PATCH", body });
  },
  aiInstructions(category?: string): Promise<AiInstructionRow[]> {
    return apiFetch<AiInstructionRow[]>(`/admin/system/ai-instructions${buildAdminQuery({ category })}`);
  },
  createAiInstruction(body: {
    name: string;
    description?: string;
    instructionText: string;
    category?: string;
    isActive?: boolean;
    priority?: number;
  }): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/admin/system/ai-instructions", { method: "POST", body });
  },
  updateAiInstruction(id: string, patch: AiInstructionPatch): Promise<AiInstructionRow> {
    return apiFetch<AiInstructionRow>(`/admin/system/ai-instructions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
    });
  },
  removeAiInstruction(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/admin/system/ai-instructions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

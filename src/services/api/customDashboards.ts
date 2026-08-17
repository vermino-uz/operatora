import { apiFetch } from "@/services/api/client";
import type {
  CustomDashboardRow,
  DashboardEditResponse,
  DashboardMeta,
  DashboardSpec,
  ResolvedResponse,
} from "@/features/dashboards/types";

/** `custom-dashboards.controller.ts` — see `features/dashboards/types.ts`'s
 * doc comment for the full RBAC/ownership trace. No `workspace_id` param on
 * any route — the backend derives it purely from the JWT. */
export const customDashboardsApi = {
  async meta(): Promise<DashboardMeta> {
    return apiFetch<DashboardMeta>("/custom-dashboards/meta");
  },

  async list(): Promise<CustomDashboardRow[]> {
    return apiFetch<CustomDashboardRow[]>("/custom-dashboards");
  },

  async get(id: string): Promise<ResolvedResponse> {
    return apiFetch<ResolvedResponse>(`/custom-dashboards/${encodeURIComponent(id)}`);
  },

  /** Owner-only server-side; `lang` matches this app's workspace-settings
   * `uz`/`ru`/`en` convention (same set AI Chat already sends). */
  async generate(prompt: string, lang: string): Promise<ResolvedResponse> {
    return apiFetch<ResolvedResponse>("/custom-dashboards/generate", {
      method: "POST",
      body: { prompt, lang },
    });
  },

  async edit(id: string, prompt: string, lang: string): Promise<DashboardEditResponse> {
    return apiFetch<DashboardEditResponse>(`/custom-dashboards/${encodeURIComponent(id)}/edit`, {
      method: "POST",
      body: { prompt, lang },
    });
  },

  async save(
    id: string,
    patch: { title?: string; description?: string; category?: string; spec?: DashboardSpec; shared?: boolean },
  ): Promise<CustomDashboardRow> {
    return apiFetch<CustomDashboardRow>(`/custom-dashboards/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: patch,
    });
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>(`/custom-dashboards/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

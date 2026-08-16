import { apiFetch } from "@/services/api/client";
import { normalizeTaskModuleSettings, type TaskModuleSettings } from "@/features/tasks-settings/types";

/** `GET/PUT /tasks/settings` — `tasks.controller.ts`'s `TaskSettingsService`,
 * workspace derived purely from the JWT (no `workspace_id` param). */
export const taskSettingsApi = {
  async get(): Promise<TaskModuleSettings> {
    const data = await apiFetch<unknown>("/tasks/settings");
    return normalizeTaskModuleSettings(data);
  },

  async update(settings: TaskModuleSettings): Promise<TaskModuleSettings> {
    const data = await apiFetch<unknown>("/tasks/settings", { method: "PUT", body: settings });
    return normalizeTaskModuleSettings(data);
  },
};

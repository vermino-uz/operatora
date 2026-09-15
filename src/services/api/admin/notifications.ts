import { apiFetch } from "@/services/api/client";
import { env } from "@/config/env";
import type { SendNotificationInput, SendNotificationResponse } from "@/features/admin/types";

/**
 * `POST /admin/notifications/send` — confirmed against
 * `admin-notifications.controller.ts`. Image upload reuses the real,
 * already-guarded `storage/avatars/upload` proxy (public/image-only/5MB
 * bucket — see `storage-proxy/buckets.ts`), same as the old admin
 * frontend's `useUploadNotificationImage`.
 */
export const adminNotificationsApi = {
  send(input: SendNotificationInput): Promise<SendNotificationResponse> {
    return apiFetch<SendNotificationResponse>("/admin/notifications/send", {
      method: "POST",
      body: input,
    });
  },
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch<{ path: string }>("/storage/avatars/upload", {
      method: "POST",
      body: form,
    });
    const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
    return `${base}/storage/avatars/public/${res.path}`;
  },
};

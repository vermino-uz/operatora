import { env } from "@/config/env";
import { apiFetch } from "@/services/api/client";
import { ApiError } from "@/types/api";
import type { WorkspaceSettingsResponse } from "@/features/settings/types";

/** `avatars` bucket config (backend `storage-proxy/buckets.ts`) — kept in
 * sync manually since there's no shared contract file to import from. */
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function logoExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function logoStoragePath(workspaceId: string, mime: string): string {
  return `workspaces/${workspaceId}/logo.${logoExtension(mime)}`;
}

const LOGO_PUBLIC_URL_PREFIX = `${env.apiBaseUrl}/storage/avatars/public/`;

/** Building the public URL from a storage path is a pure client-side string
 * op (mirrors the old frontend's `getPublicUrl`) — the `avatars` bucket is
 * `public: true` server-side, so `GET /storage/avatars/public/*` needs no
 * auth and there's no network round-trip to "resolve" a URL. */
function logoPublicUrl(path: string): string {
  return `${LOGO_PUBLIC_URL_PREFIX}${path}`;
}

/** Inverse of `logoPublicUrl` — only `company.logo_url` (a full URL) is
 * persisted, but removal needs the raw storage path back. */
export function logoPathFromPublicUrl(url: string): string | null {
  return url.startsWith(LOGO_PUBLIC_URL_PREFIX) ? url.slice(LOGO_PUBLIC_URL_PREFIX.length) : null;
}

/** Same confirmed exception as `conversations.ts`/`chat.ts` — the backend
 * doesn't derive workspace from the JWT alone here, `workspace_id` must be
 * sent explicitly. */
export const settingsApi = {
  /** `GET /workspace-settings` 404s for a workspace that's never saved
   * settings before (brand new workspace) — the old frontend treats that
   * as "empty defaults", not an error; matched here so the form doesn't
   * show an error state on a workspace's very first visit to this page. */
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettingsResponse> {
    try {
      return await apiFetch<WorkspaceSettingsResponse>(
        `/workspace-settings?workspace_id=${encodeURIComponent(workspaceId)}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.isNotFound) {
        return { workspace_id: workspaceId, workspace_name: null, company: {}, notifications: {} };
      }
      throw err;
    }
  },

  async updateCompany(
    workspaceId: string,
    values: { workspace_name: string; company: Record<string, unknown> },
  ): Promise<WorkspaceSettingsResponse> {
    return apiFetch<WorkspaceSettingsResponse>(`/workspace-settings/company`, {
      method: "PUT",
      body: {
        workspace_id: workspaceId,
        workspace_name: values.workspace_name,
        company: values.company,
      },
    });
  },

  /** Uploads to the workspace-scoped path convention the old frontend
   * uses (`workspaces/{id}/logo.{ext}`), `upsert=1` so re-uploading just
   * overwrites the previous logo instead of accumulating files. Returns
   * the public URL to persist via `updateCompany`'s `company.logo_url`. */
  async uploadLogo(workspaceId: string, file: File): Promise<{ path: string; url: string }> {
    const path = logoStoragePath(workspaceId, file.type);
    const form = new FormData();
    form.append("file", file);
    form.append("path", path);
    form.append("upsert", "1");
    const res = await apiFetch<{ path: string; size: number }>(`/storage/avatars/upload`, {
      method: "POST",
      body: form,
    });
    return { path: res.path, url: logoPublicUrl(res.path) };
  },

  async removeLogo(paths: string[]): Promise<void> {
    await apiFetch<{ ok: true; count: number }>(`/storage/avatars/remove`, {
      method: "POST",
      body: { paths },
    });
  },

  /** `PUT /workspace-settings/notifications` — distinct endpoint from
   * `/company`, confirmed via the backend controller (see
   * `features/settings/types.ts`'s `WorkspaceNotificationSettings` doc). */
  async updateNotifications(
    workspaceId: string,
    notifications: Record<string, unknown>,
  ): Promise<WorkspaceSettingsResponse> {
    return apiFetch<WorkspaceSettingsResponse>(`/workspace-settings/notifications`, {
      method: "PUT",
      body: { workspace_id: workspaceId, notifications },
    });
  },
};

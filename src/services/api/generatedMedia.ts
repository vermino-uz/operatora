import { apiFetch } from "@/services/api/client";
import { uploadFile } from "@/services/api/uploadFile";
import { UPLOAD_CONSTRAINTS } from "@/constants/buckets";
import { ApiError } from "@/types/api";
import type {
  GalleryKindFilter,
  GallerySourceFilter,
  GeneratedMediaItem,
  ImageGenQuota,
  InstagramVariant,
  MediaBatchResult,
} from "@/features/gallery/types";

/** `true` if the backend rejected the call because a plan-limit quota is
 * exhausted (`ForbiddenException` with `code: 'plan_limit'` — see
 * `generated-media.service.ts#assertEnabled`). Distinguishing this from a
 * generic 403 lets the UI show an upgrade prompt instead of a bare
 * "forbidden" message. */
export function isPlanLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "plan_limit";
}

export interface GeneratedMediaListFilters {
  source?: GallerySourceFilter;
  kind?: GalleryKindFilter;
  limit?: number;
  before?: string;
}

/** Same `?workspace_id=` override pattern as `services/api/higgsfield.ts`
 * — the JWT carries a default workspace, but the controller
 * (`generated-media.controller.ts#resolveWorkspace`) explicitly accepts an
 * override for the UI's currently-selected workspace, re-verifying
 * membership server-side either way. */
function withWorkspace(path: string, workspaceId: string, extraQuery?: Record<string, string>): string {
  const qs = new URLSearchParams({ workspace_id: workspaceId, ...extraQuery });
  return `${path}?${qs.toString()}`;
}

export const generatedMediaApi = {
  async list(workspaceId: string, filters?: GeneratedMediaListFilters): Promise<GeneratedMediaItem[]> {
    const extra: Record<string, string> = {};
    if (filters?.source && filters.source !== "all") extra.source = filters.source;
    if (filters?.kind && filters.kind !== "all") extra.kind = filters.kind;
    if (filters?.limit) extra.limit = String(filters.limit);
    if (filters?.before) extra.before = filters.before;
    const res = await apiFetch<{ items: GeneratedMediaItem[] }>(withWorkspace("/generated-media", workspaceId, extra));
    return Array.isArray(res?.items) ? res.items : [];
  },

  async quota(workspaceId: string): Promise<ImageGenQuota> {
    return apiFetch<ImageGenQuota>(withWorkspace("/generated-media/quota", workspaceId));
  },

  async getOne(workspaceId: string, id: string): Promise<GeneratedMediaItem | null> {
    const res = await apiFetch<{ item: GeneratedMediaItem | null }>(
      withWorkspace(`/generated-media/${encodeURIComponent(id)}`, workspaceId),
    );
    return res.item ?? null;
  },

  async remove(workspaceId: string, id: string): Promise<void> {
    await apiFetch<{ ok: true }>(withWorkspace(`/generated-media/${encodeURIComponent(id)}`, workspaceId), {
      method: "DELETE",
    });
  },

  /** Regenerate / initial chat-side generation — 1 quota unit. */
  async generate(
    workspaceId: string,
    params: { prompt: string; sourceMediaId?: string | null; sourceMediaIds?: string[] | null; threadId?: string | null },
  ): Promise<{ item: GeneratedMediaItem; quota: ImageGenQuota }> {
    return apiFetch<{ item: GeneratedMediaItem; quota: ImageGenQuota }>(withWorkspace("/generated-media/generate", workspaceId), {
      method: "POST",
      body: params,
    });
  },

  /** Source-photo upload — no quota cost. Client-side constraints mirror
   * the backend's actual enforced limit for THIS route (15 MB,
   * png/jpeg/webp — see `constants/buckets.ts` doc comment; stricter than
   * the `generated-media` bucket's general 25 MB ceiling). */
  async uploadSource(
    workspaceId: string,
    file: File,
    opts?: { prompt?: string; threadId?: string | null },
  ): Promise<GeneratedMediaItem> {
    const extraFields: Record<string, string> = {};
    if (opts?.prompt) extraFields.prompt = opts.prompt;
    if (opts?.threadId) extraFields.threadId = opts.threadId;
    return uploadFile<GeneratedMediaItem>(withWorkspace("/generated-media/upload", workspaceId), file, {
      constraints: UPLOAD_CONSTRAINTS.generatedMediaUpload,
      extraFields,
    });
  },

  async catalogize(
    workspaceId: string,
    params: { mediaIds: string[]; style?: string; instruction?: string },
  ): Promise<MediaBatchResult> {
    return apiFetch<MediaBatchResult>(withWorkspace("/generated-media/catalogize", workspaceId), {
      method: "POST",
      body: params,
    });
  },

  async edit(workspaceId: string, params: { mediaIds: string[]; instruction: string }): Promise<MediaBatchResult> {
    return apiFetch<MediaBatchResult>(withWorkspace("/generated-media/edit", workspaceId), {
      method: "POST",
      body: params,
    });
  },

  async instagramVariants(
    workspaceId: string,
    params: { topic: string; count?: number; language?: string },
  ): Promise<{ variants: InstagramVariant[]; publishEnabled: boolean }> {
    return apiFetch<{ variants: InstagramVariant[]; publishEnabled: boolean }>(
      withWorkspace("/generated-media/instagram-variants", workspaceId),
      { method: "POST", body: params },
    );
  },
};

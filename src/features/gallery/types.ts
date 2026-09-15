/**
 * Gallery / generated-media types — mirrored 1:1 from the backend's real,
 * dedicated REST controller (`generated-media/generated-media.controller.ts`
 * + `.service.ts`), confirmed by reading (not modifying)
 * `/www/wwwroot/dev.operatora/app/backend/src/generated-media/`. Unlike
 * `forms`, this is NOT a db-proxy table — it has its own
 * `@Controller('generated-media')` with `generate`/`upload`/`catalogize`/
 * `edit`/`instagram-variants`/`list`/`quota`/`getOne`/`remove` endpoints, so
 * `services/api/generatedMedia.ts` calls those directly.
 *
 * Gallery is the AI Chat page's image-gen output browser — it is
 * deliberately excluded from the sidebar in both the old app and this
 * rebuild's `constants/sitemap.ts` (see that file's doc comment); this page
 * is reachable directly at `/gallery`.
 */
export type GeneratedMediaSource = "chat" | "higgsfield" | "upload" | string;
export type GeneratedMediaKind = "image" | "video" | string;

export interface GeneratedMediaItem {
  id: string;
  source: GeneratedMediaSource;
  kind: GeneratedMediaKind;
  prompt: string;
  model: string | null;
  status: string;
  sourceMediaId: string | null;
  threadId: string | null;
  createdAt: string;
  /** Signed (workspace storage) or external (Higgsfield) URL — time-limited
   * by the backend itself; never cached beyond what the browser already does. */
  url: string | null;
}

export interface ImageGenQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  disabled: boolean;
}

export interface MediaBatchFailure {
  mediaId: string;
  reason: string;
}

export interface MediaBatchResult {
  items: GeneratedMediaItem[];
  failed: MediaBatchFailure[];
  quota: ImageGenQuota | null;
}

export interface InstagramVariant {
  caption: string;
  hashtags: string[];
}

export type GallerySourceFilter = "all" | "upload" | "chat" | "higgsfield";
export type GalleryKindFilter = "all" | "image" | "video";

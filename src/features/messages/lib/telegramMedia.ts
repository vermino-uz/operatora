import type { TelegramMessage } from "@/features/messages/types";

/** Message kinds we can render inline (not just a placeholder label). */
export const TELEGRAM_RENDERABLE_MEDIA_KINDS = new Set([
  "photo",
  "sticker",
  "video",
  "video_note",
  "voice",
  "audio",
  "animation",
  "document",
]);

export function isTelegramRenderableMediaKind(kind: string | null | undefined): boolean {
  return TELEGRAM_RENDERABLE_MEDIA_KINDS.has(kind || "");
}

function thumbFileIdFromMedia(obj: Record<string, unknown> | null | undefined): string | null {
  if (!obj) return null;
  const thumb = obj.thumb ?? obj.thumbnail;
  if (thumb && typeof thumb === "object") {
    const fileId = (thumb as Record<string, unknown>).file_id;
    if (typeof fileId === "string" && fileId.trim()) return fileId;
  }
  return null;
}

function documentVideoKind(doc: Record<string, unknown>): "video" | "video_note" | null {
  const mime = typeof doc.mime_type === "string" ? doc.mime_type : "";
  const attrs = Array.isArray(doc.attributes) ? doc.attributes : [];
  const isRound = attrs.some(
    (attr) =>
      attr &&
      typeof attr === "object" &&
      (attr as Record<string, unknown>).round_message === true,
  );
  if (isRound) return "video_note";
  if (mime.startsWith("video/")) return "video";
  return null;
}

/** Infer kind from `telegram_data` when legacy rows stored everything as `text`. */
export function resolveTelegramMessageKind(message: TelegramMessage): string {
  const stored = message.message_kind || "text";
  const td = message.telegram_data as Record<string, unknown> | null | undefined;
  if (!td) return stored;

  if (Array.isArray(td.photo) && td.photo.length > 0) return "photo";
  if (td.video_note) return "video_note";
  if (td.video) return "video";
  if (td.voice) return "voice";
  if (td.audio) return "audio";
  if (td.sticker) return "sticker";
  if (td.animation) return "animation";
  if (td.document && typeof td.document === "object") {
    const asVideo = documentVideoKind(td.document as Record<string, unknown>);
    if (asVideo) return asVideo;
    if (stored === "text") return "document";
  }

  if (stored !== "text") return stored;
  return stored;
}

/** Resolve `file_id` from the row or embedded Bot/TDLib payload. */
export function resolveTelegramMessageFileId(message: TelegramMessage): string | null {
  if (message.file_id) return message.file_id;

  const td = message.telegram_data as Record<string, any> | null | undefined;
  if (!td) return null;

  if (Array.isArray(td.photo) && td.photo.length > 0) {
    return td.photo[td.photo.length - 1]?.file_id ?? null;
  }
  if (td.voice?.file_id) return td.voice.file_id;
  if (td.video?.file_id) return td.video.file_id;
  if (td.video_note?.file_id) return td.video_note.file_id;
  if (td.audio?.file_id) return td.audio.file_id;
  if (td.animation?.file_id) return td.animation.file_id;
  if (td.document?.file_id) {
    const doc = td.document as Record<string, unknown>;
    const kind = resolveTelegramMessageKind(message);
    if (kind === "document") return doc.file_id as string;
    if (kind === "video" || kind === "video_note") return doc.file_id as string;
  }
  if (td.sticker?.file_id) {
    const st = td.sticker;
    const thumb = st.thumbnail?.file_id || st.thumb?.file_id;
    if (st.is_animated && !st.is_video && thumb) return thumb;
    return st.file_id;
  }
  return null;
}

/** Telegram ships a separate JPEG thumb for video / round-video / GIF messages. */
export function resolveTelegramMessageThumbnailFileId(message: TelegramMessage): string | null {
  const td = message.telegram_data as Record<string, unknown> | null | undefined;
  if (!td) return null;

  const kind = resolveTelegramMessageKind(message);
  if (kind === "video" && td.video && typeof td.video === "object") {
    return thumbFileIdFromMedia(td.video as Record<string, unknown>);
  }
  if (kind === "video_note" && td.video_note && typeof td.video_note === "object") {
    return thumbFileIdFromMedia(td.video_note as Record<string, unknown>);
  }
  if (kind === "animation" && td.animation && typeof td.animation === "object") {
    return thumbFileIdFromMedia(td.animation as Record<string, unknown>);
  }
  if ((kind === "video" || kind === "video_note") && td.document && typeof td.document === "object") {
    return thumbFileIdFromMedia(td.document as Record<string, unknown>);
  }
  return null;
}

export function telegramMediaFallbackLabel(kind: string): string {
  switch (kind) {
    case "photo":
      return "Photo";
    case "video":
    case "video_note":
      return "Video";
    case "voice":
    case "audio":
      return "Voice message";
    case "sticker":
      return "Sticker";
    case "animation":
      return "GIF";
    case "document":
      return "Document";
    default:
      return `[${kind}]`;
  }
}

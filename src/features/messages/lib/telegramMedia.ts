import { env } from "@/config/env";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

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
  "contact",
]);

export function isTelegramRenderableMediaKind(kind: string | null | undefined): boolean {
  return TELEGRAM_RENDERABLE_MEDIA_KINDS.has(kind || "");
}

type TelegramData = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** `telegram_data` is usually a JSON object; tolerate stringified rows. */
function parseTelegramData(message: TelegramMessage): TelegramData | null {
  const raw = message.telegram_data;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

export function resolveStickerSetName(message: TelegramMessage): string | null {
  const td = parseTelegramData(message);
  const sticker = asRecord(td?.sticker);
  const setName = sticker?.set_name;
  return typeof setName === "string" && setName.trim() ? setName.trim() : null;
}

function hasVideoNotePayload(td: TelegramData): boolean {
  const note = asRecord(td.video_note);
  if (!note) return false;
  return Boolean(
    (typeof note.file_id === "string" && note.file_id.trim()) ||
      note.length != null ||
      note.duration != null ||
      thumbFileIdFromMedia(note),
  );
}

function thumbFileIdFromMedia(obj: Record<string, unknown> | null | undefined): string | null {
  if (!obj) return null;
  const thumb = obj.thumb ?? obj.thumbnail;
  const thumbRec = asRecord(thumb);
  if (thumbRec) {
    const fileId = thumbRec.file_id;
    if (typeof fileId === "string" && fileId.trim()) return fileId;
  }
  return null;
}

function tdlibRemoteFileId(node: unknown): string | null {
  const rec = asRecord(node);
  if (!rec) return null;
  const remote = asRecord(rec.remote);
  if (remote && typeof remote.id === "string" && remote.id.trim()) return remote.id;
  if (typeof rec.file_id === "string" && rec.file_id.trim()) return rec.file_id;
  if (rec.id != null) return String(rec.id);
  return null;
}

function photoFileIdFromTelegramData(td: TelegramData): string | null {
  const photo = td.photo;
  if (Array.isArray(photo) && photo.length > 0) {
    const last = photo[photo.length - 1];
    const lastRec = asRecord(last);
    if (lastRec && typeof lastRec.file_id === "string") return lastRec.file_id;
    return tdlibRemoteFileId(last);
  }
  const photoRec = asRecord(photo);
  if (photoRec) {
    if (typeof photoRec.file_id === "string" && photoRec.file_id.trim()) return photoRec.file_id;
    const sizes = photoRec.sizes;
    if (Array.isArray(sizes) && sizes.length > 0) {
      const biggest = sizes[sizes.length - 1];
      const biggestRec = asRecord(biggest);
      if (biggestRec) return tdlibRemoteFileId(biggestRec.photo) ?? tdlibRemoteFileId(biggestRec);
    }
    return tdlibRemoteFileId(photoRec.photo) ?? tdlibRemoteFileId(photoRec);
  }
  return null;
}

function documentVideoKind(doc: Record<string, unknown>): "video" | "video_note" | null {
  const mime = typeof doc.mime_type === "string" ? doc.mime_type : "";
  const attrs = Array.isArray(doc.attributes) ? doc.attributes : [];
  const isRound = attrs.some((attr) => asRecord(attr)?.round_message === true);
  if (isRound) return "video_note";
  if (mime.startsWith("video/")) return "video";
  const name = typeof doc.file_name === "string" ? doc.file_name.toLowerCase() : "";
  if (/\.(mp4|mov|webm|mkv|m4v|avi)$/.test(name)) return "video";
  return null;
}

function tdlibContentKind(content: Record<string, unknown>): string | null {
  const type = content._;
  switch (type) {
    case "messagePhoto":
      return "photo";
    case "messageVideo":
      return "video";
    case "messageVideoNote":
      return "video_note";
    case "messageAnimation":
      return "animation";
    case "messageSticker":
      return "sticker";
    case "messageVoiceNote":
      return "voice";
    case "messageAudio":
      return "audio";
    case "messageDocument":
      return "document";
    case "messageContact":
      return "contact";
    default:
      return null;
  }
}

function fileIdFromTdlibContent(content: Record<string, unknown>, kind: string): string | null {
  switch (kind) {
    case "photo": {
      const photo = asRecord(content.photo);
      const sizes = photo?.sizes;
      if (Array.isArray(sizes) && sizes.length > 0) {
        const biggest = sizes[sizes.length - 1];
        const biggestRec = asRecord(biggest);
        return tdlibRemoteFileId(biggestRec?.photo) ?? tdlibRemoteFileId(biggestRec);
      }
      return null;
    }
    case "video":
      return tdlibRemoteFileId(asRecord(content.video)?.video);
    case "video_note":
      return tdlibRemoteFileId(asRecord(content.video_note)?.video);
    case "animation":
      return tdlibRemoteFileId(asRecord(content.animation)?.animation);
    case "sticker":
      return tdlibRemoteFileId(asRecord(content.sticker)?.sticker);
    case "voice":
      return tdlibRemoteFileId(asRecord(content.voice_note)?.voice);
    case "audio":
      return tdlibRemoteFileId(asRecord(content.audio)?.audio);
    case "document":
      return tdlibRemoteFileId(asRecord(content.document)?.document);
    default:
      return null;
  }
}

/** Infer kind from `telegram_data` when legacy rows stored everything as `text`. */
export function resolveTelegramMessageKind(message: TelegramMessage): string {
  const stored = message.message_kind || "text";
  const td = parseTelegramData(message);
  const mediaType = message.media_type;

  if (stored === "video_note") return "video_note";

  if (mediaType === "video" || mediaType === "video_note" || mediaType === "animation") {
    return mediaType;
  }
  if (mediaType === "photo") return "photo";
  if (mediaType === "voice" || mediaType === "audio") return mediaType;
  if (mediaType === "sticker" || mediaType === "animation") return mediaType;
  if (mediaType === "document") {
    if (td?.document) {
      const asVideo = documentVideoKind(td.document as Record<string, unknown>);
      if (asVideo) return asVideo;
    }
    return "document";
  }

  if (td) {
    const content = asRecord(td.content);
    if (content) {
      const contentKind = tdlibContentKind(content);
      if (contentKind) {
        if (contentKind === "document" && td.document) {
          const asVideo = documentVideoKind(td.document as Record<string, unknown>);
          if (asVideo) return asVideo;
        }
        return contentKind;
      }
    }

    if (photoFileIdFromTelegramData(td)) return "photo";
    if (hasVideoNotePayload(td)) return "video_note";
    if (td.video) return "video";
    if (td.voice) return "voice";
    if (td.audio) return "audio";
    if (td.sticker) return "sticker";
    if (td.animation) return "animation";
    if (td.contact) return "contact";
    if (td.document && typeof td.document === "object") {
      const asVideo = documentVideoKind(td.document as Record<string, unknown>);
      if (asVideo) return asVideo;
      if (stored === "text" || stored === "document") return "document";
    }
  }

  if (stored === "document" && td?.document) {
    const asVideo = documentVideoKind(td.document as Record<string, unknown>);
    if (asVideo) return asVideo;
  }

  if (stored !== "text") return stored;
  return stored;
}

/** Resolve `file_id` from the row or embedded Bot/TDLib/Pyrogram payload. */
export function resolveTelegramMessageFileId(message: TelegramMessage): string | null {
  if (message.file_id) return message.file_id;

  const td = parseTelegramData(message);
  if (!td) return null;

  const kind = resolveTelegramMessageKind(message);
  const content = asRecord(td.content);
  if (content) {
    const fromContent = fileIdFromTdlibContent(content, kind);
    if (fromContent) return fromContent;
  }

  const photoId = photoFileIdFromTelegramData(td);
  if (photoId && (kind === "photo" || td.photo)) return photoId;

  const voice = asRecord(td.voice);
  if (voice?.file_id && typeof voice.file_id === "string") return voice.file_id;

  const videoNote = asRecord(td.video_note);
  if (videoNote?.file_id && typeof videoNote.file_id === "string") {
    return videoNote.file_id;
  }

  const video = asRecord(td.video);
  if (video?.file_id && typeof video.file_id === "string" && kind !== "video_note") {
    return video.file_id;
  }

  const audio = asRecord(td.audio);
  if (audio?.file_id && typeof audio.file_id === "string") return audio.file_id;

  const animation = asRecord(td.animation);
  if (animation?.file_id && typeof animation.file_id === "string") return animation.file_id;

  const document = asRecord(td.document);
  if (document?.file_id && typeof document.file_id === "string") {
    if (kind === "document" || kind === "video" || kind === "video_note") {
      return document.file_id;
    }
  }

  const sticker = asRecord(td.sticker);
  if (sticker) {
    const thumb = asRecord(sticker.thumbnail)?.file_id ?? asRecord(sticker.thumb)?.file_id;
    if (sticker.is_animated && !sticker.is_video && typeof thumb === "string" && thumb.trim()) {
      return thumb;
    }
    if (typeof sticker.file_id === "string" && sticker.file_id.trim()) return sticker.file_id;
  }

  return null;
}

/** Telegram ships a separate JPEG thumb for video / round-video / GIF messages. */
export function resolveTelegramMessageThumbnailFileId(message: TelegramMessage): string | null {
  const td = parseTelegramData(message);
  if (!td) return null;

  const kind = resolveTelegramMessageKind(message);
  const content = asRecord(td.content);

  if (kind === "video") {
    if (td.video) return thumbFileIdFromMedia(td.video as Record<string, unknown>);
    if (content) {
      const video = asRecord(content.video);
      const videoNode = asRecord(video?.video);
      if (videoNode) return thumbFileIdFromMedia(videoNode);
    }
  }
  if (kind === "video_note") {
    if (td.video_note) return thumbFileIdFromMedia(td.video_note as Record<string, unknown>);
    if (content) {
      const note = asRecord(content.video_note);
      const videoNode = asRecord(note?.video);
      if (videoNode) return thumbFileIdFromMedia(videoNode);
    }
  }
  if (kind === "animation") {
    if (td.animation) return thumbFileIdFromMedia(td.animation as Record<string, unknown>);
    if (content) {
      const anim = asRecord(content.animation);
      const animNode = asRecord(anim?.animation);
      if (animNode) return thumbFileIdFromMedia(animNode);
    }
  }
  if ((kind === "video" || kind === "video_note") && td.document) {
    return thumbFileIdFromMedia(td.document as Record<string, unknown>);
  }
  return null;
}

type StickerTelegramData = {
  file_id?: string;
  is_animated?: boolean;
  is_video?: boolean;
  thumbnail?: { file_id?: string };
  thumb?: { file_id?: string };
};

/** Pick the best Telegram file_id to preview a sticker in the browser. */
export function resolveStickerFileIds(message: TelegramMessage): {
  fileId: string | null;
  preferVideo: boolean;
} {
  const td = parseTelegramData(message);
  const sticker = td?.sticker as StickerTelegramData | undefined;
  const main = message.file_id || sticker?.file_id || null;
  if (!sticker) return { fileId: main, preferVideo: false };

  const thumb = sticker.thumbnail?.file_id || sticker.thumb?.file_id || null;
  if (sticker.is_video) return { fileId: main, preferVideo: true };
  if (sticker.is_animated && thumb) return { fileId: thumb, preferVideo: false };
  return { fileId: main, preferVideo: false };
}

export function resolveTelegramContactInfo(message: TelegramMessage): {
  phone?: string;
  firstName?: string;
  lastName?: string;
} | null {
  const td = parseTelegramData(message);
  const contact = asRecord(td?.contact);
  if (!contact) {
    if (message.message_kind === "contact" || resolveTelegramMessageKind(message) === "contact") {
      const phone = (message.text_content || "").trim();
      return phone ? { phone } : null;
    }
    return null;
  }
  return {
    phone: typeof contact.phone_number === "string" ? contact.phone_number : undefined,
    firstName: typeof contact.first_name === "string" ? contact.first_name : undefined,
    lastName: typeof contact.last_name === "string" ? contact.last_name : undefined,
  };
}

export function resolveTelegramDocumentLabel(message: TelegramMessage): string | null {
  const td = parseTelegramData(message);
  const doc = asRecord(td?.document);
  if (doc && typeof doc.file_name === "string" && doc.file_name.trim()) return doc.file_name.trim();
  const caption = (message.text_content || "").trim();
  return caption || null;
}

/** Build a proxied media URL for a known `file_id` (no message parsing). */
export function buildTelegramMessageMediaUrl(
  fileId: string,
  chat: TelegramChat,
  message?: Pick<TelegramMessage, "bot_integration_id"> | null,
): string {
  const isAccountChat = chat.source === "user_account" || Boolean(chat.user_session_id);
  if (isAccountChat) {
    return `${env.apiBaseUrl}/telegram-media/account/${encodeURIComponent(chat.id)}/${encodeURIComponent(fileId)}`;
  }
  if (chat.business_connection_id) {
    return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?business=1`;
  }
  const botId = message?.bot_integration_id || chat.bot_integration_id;
  if (botId) {
    return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?bot_id=${encodeURIComponent(botId)}`;
  }
  return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?business=1`;
}

/** `GET /telegram-media/:fileId?bot_id=|business=1` or account path — public proxy. */
export function telegramMessageMediaUrl(
  message: TelegramMessage,
  chat: TelegramChat,
  fileIdOverride?: string | null,
): string | null {
  const fileId = fileIdOverride ?? resolveTelegramMessageFileId(message);
  if (!fileId) return null;
  return buildTelegramMessageMediaUrl(fileId, chat, message);
}

export function resolveTelegramMessageMediaPresentation(
  message: TelegramMessage,
  chat: TelegramChat,
): {
  kind: string;
  mediaUrl: string | null;
  posterUrl: string | null;
  stickerPreferVideo: boolean;
  documentLabel: string | null;
  contactInfo: ReturnType<typeof resolveTelegramContactInfo>;
  hasRenderableMedia: boolean;
} {
  const kind = resolveTelegramMessageKind(message);
  const stickerResolved = kind === "sticker" ? resolveStickerFileIds(message) : null;
  const primaryFileId = stickerResolved?.fileId ?? resolveTelegramMessageFileId(message);
  const mediaUrl = primaryFileId ? telegramMessageMediaUrl(message, chat, primaryFileId) : null;
  const thumbFileId = resolveTelegramMessageThumbnailFileId(message);
  const posterUrl = thumbFileId ? telegramMessageMediaUrl(message, chat, thumbFileId) : null;
  const contactInfo = kind === "contact" ? resolveTelegramContactInfo(message) : null;

  const hasRenderableMedia: boolean =
    contactInfo != null ||
    (mediaUrl != null && isTelegramRenderableMediaKind(kind)) ||
    (posterUrl != null && (kind === "video" || kind === "video_note" || kind === "animation"));

  return {
    kind,
    mediaUrl: hasRenderableMedia && kind !== "contact" ? mediaUrl : null,
    posterUrl: hasRenderableMedia ? posterUrl : null,
    stickerPreferVideo: stickerResolved?.preferVideo ?? false,
    documentLabel: kind === "document" ? resolveTelegramDocumentLabel(message) : null,
    contactInfo: hasRenderableMedia ? contactInfo : null,
    hasRenderableMedia,
  };
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
    case "contact":
      return "Contact";
    default:
      return `[${kind}]`;
  }
}

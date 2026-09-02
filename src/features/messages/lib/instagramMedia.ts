import { env } from "@/config/env";
import type { InstagramMessage } from "@/features/messages/types";

export type InstagramMediaLayout = "default" | "portrait";

export type InstagramAttachmentKind = "photo" | "video" | "audio" | "link";

export function resolveInstagramMessageMedia(message: InstagramMessage): {
  url: string | null;
  posterUrl: string | null;
  kind: InstagramAttachmentKind | null;
  layout: InstagramMediaLayout;
  linkLabel: string | null;
} {
  const type = (message.message_type || "").toLowerCase();
  const mediaType = (message.media_type || "").toLowerCase();
  const directUrl = message.media_url?.trim() || message.preview_url?.trim() || null;

  if (type === "image" || type === "photo" || (mediaType === "image" && directUrl)) {
    return directUrl
      ? { url: directUrl, posterUrl: null, kind: "photo", layout: "default", linkLabel: null }
      : { url: null, posterUrl: null, kind: null, layout: "default", linkLabel: null };
  }

  if (type === "video" || type === "ig_reel") {
    const url =
      type === "ig_reel" && message.id
        ? `${env.apiBaseUrl}/instagram/messages/${encodeURIComponent(message.id)}/video`
        : directUrl;
    const posterUrl =
      message.id && (type === "ig_reel" || type === "video")
        ? `${env.apiBaseUrl}/instagram/messages/${encodeURIComponent(message.id)}/thumbnail`
        : null;
    return url
      ? { url, posterUrl, kind: "video", layout: "portrait", linkLabel: null }
      : { url: null, posterUrl: null, kind: null, layout: "default", linkLabel: null };
  }

  if (type === "audio" || type === "voice" || mediaType === "audio") {
    const url = message.id
      ? `${env.apiBaseUrl}/instagram/messages/${encodeURIComponent(message.id)}/audio`
      : directUrl;
    return url
      ? { url, posterUrl: null, kind: "audio", layout: "default", linkLabel: null }
      : { url: null, posterUrl: null, kind: null, layout: "default", linkLabel: null };
  }

  if (type === "share" || type === "story_mention" || type === "story_reply") {
    const linkLabel =
      type === "share"
        ? "Shared post"
        : type === "story_mention"
          ? "Story mention"
          : "Story reply";
    return directUrl
      ? { url: directUrl, posterUrl: null, kind: "link", layout: "default", linkLabel }
      : { url: null, posterUrl: null, kind: "link", layout: "default", linkLabel };
  }

  return { url: null, posterUrl: null, kind: null, layout: "default", linkLabel: null };
}

export function instagramMediaFallbackLabel(messageType: string | null | undefined): string {
  switch ((messageType || "").toLowerCase()) {
    case "image":
    case "photo":
      return "Photo";
    case "video":
      return "Video";
    case "ig_reel":
      return "Reel";
    case "audio":
    case "voice":
      return "Voice message";
    case "share":
      return "Shared post";
    case "story_mention":
      return "Story mention";
    case "story_reply":
      return "Story reply";
    default:
      return messageType ? `[${messageType}]` : "Attachment";
  }
}

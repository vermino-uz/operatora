import { env } from "@/config/env";
import type { InstagramMessage } from "@/features/messages/types";

export type InstagramMediaLayout = "default" | "portrait";

export function resolveInstagramMessageMedia(message: InstagramMessage): {
  url: string | null;
  posterUrl: string | null;
  kind: string | null;
  layout: InstagramMediaLayout;
} {
  const type = (message.message_type || "").toLowerCase();
  const directUrl = message.media_url?.trim() || null;

  if (type === "image" || type === "photo") {
    return directUrl
      ? { url: directUrl, posterUrl: null, kind: "photo", layout: "default" }
      : { url: null, posterUrl: null, kind: null, layout: "default" };
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
      ? { url, posterUrl, kind: "video", layout: "portrait" }
      : { url: null, posterUrl: null, kind: null, layout: "default" };
  }

  if (type === "audio" || type === "voice") {
    const url = message.id
      ? `${env.apiBaseUrl}/instagram/messages/${encodeURIComponent(message.id)}/audio`
      : directUrl;
    return url
      ? { url, posterUrl: null, kind: "audio", layout: "default" }
      : { url: null, posterUrl: null, kind: null, layout: "default" };
  }

  return { url: null, posterUrl: null, kind: null, layout: "default" };
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

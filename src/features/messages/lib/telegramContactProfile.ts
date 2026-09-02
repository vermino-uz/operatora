import { buildTelegramMessageMediaUrl } from "@/features/messages/lib/telegramMedia";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

export type ProfileMediaCategory = "photo" | "video" | "audio" | "voice" | "document" | "links";

export interface ProfileMediaStats {
  photos: number;
  videos: number;
  files: number;
  audio: number;
  voice: number;
  links: number;
}

export interface ProfileLinkItem {
  id: string;
  url: string;
  created_at?: string;
}

export function countProfileLinks(messages: TelegramMessage[]): number {
  const urlRe = /https?:\/\/[^\s]+/g;
  let n = 0;
  for (const m of messages) {
    const matches = (m.text_content || "").match(urlRe);
    if (matches) n += matches.length;
  }
  return n;
}

export function extractProfileLinks(messages: TelegramMessage[]): ProfileLinkItem[] {
  const urlRe = /https?:\/\/[^\s]+/g;
  const out: ProfileLinkItem[] = [];
  for (const m of messages) {
    const matches = (m.text_content || "").match(urlRe);
    if (!matches) continue;
    for (const url of matches) {
      out.push({ url, created_at: m.created_at, id: `${m.id}-${url}` });
    }
  }
  return out.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

export function computeProfileMediaStats(messages: TelegramMessage[]): ProfileMediaStats {
  const stats: ProfileMediaStats = {
    photos: 0,
    videos: 0,
    files: 0,
    audio: 0,
    voice: 0,
    links: countProfileLinks(messages),
  };
  for (const m of messages) {
    const k = m.message_kind || "text";
    if (k === "photo") stats.photos++;
    else if (k === "video") stats.videos++;
    else if (k === "document") stats.files++;
    else if (k === "audio") stats.audio++;
    else if (k === "voice") stats.voice++;
  }
  return stats;
}

export function groupProfileMediaByKind(messages: TelegramMessage[]) {
  const withFile = (kind: string) =>
    messages
      .filter((m) => m.message_kind === kind && m.file_id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return {
    photo: withFile("photo"),
    video: withFile("video"),
    audio: withFile("audio"),
    voice: withFile("voice"),
    document: withFile("document"),
    links: extractProfileLinks(messages),
  };
}

export function profileMessageMediaUrl(message: TelegramMessage, chat: TelegramChat): string | null {
  const fileId = message.file_id;
  if (!fileId) return null;
  return buildTelegramMessageMediaUrl(fileId, chat, message);
}

export function formatProfileLastActive(iso?: string | null): string {
  if (!iso) return "Recently active";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently active";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Last active today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Last active yesterday";
  return `Last active ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export const PROFILE_MEDIA_LABELS: Record<ProfileMediaCategory, string> = {
  photo: "Photos",
  video: "Videos",
  audio: "Audio files",
  voice: "Voice messages",
  document: "Files",
  links: "Shared links",
};

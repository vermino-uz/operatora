import { env } from "@/config/env";
import { isTelegramAccountChat, type TelegramChat, type TelegramMessage } from "@/features/messages/types";

export type TelegramMessageFrom = {
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
};

/** Pull sender info from Bot API, Pyrogram, or TDLib-shaped `telegram_data`. */
export function extractTelegramMessageFrom(message: TelegramMessage): TelegramMessageFrom | null {
  const td = message.telegram_data;
  if (!td || typeof td !== "object") return null;

  const record = td as Record<string, unknown>;
  const candidates = [record.from, record.from_user, record.sender];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const from = candidate as Record<string, unknown>;
    const id = typeof from.id === "number" && Number.isFinite(from.id) ? from.id : undefined;
    if (id == null && !from.first_name && !from.last_name && !from.username) continue;
    return {
      id,
      first_name: typeof from.first_name === "string" ? from.first_name : null,
      last_name: typeof from.last_name === "string" ? from.last_name : null,
      username: typeof from.username === "string" ? from.username : null,
    };
  }
  return null;
}

export function inferTelegramChatType(chat: TelegramChat, message?: TelegramMessage): string | null {
  if (chat.chat_type) return chat.chat_type;
  const td = message?.telegram_data;
  if (!td || typeof td !== "object") return null;
  const nested = (td as Record<string, unknown>).chat;
  if (!nested || typeof nested !== "object") return null;
  const type = (nested as Record<string, unknown>).type;
  return typeof type === "string" ? type : null;
}

export function isTelegramGroupLikeChat(chat: TelegramChat, message?: TelegramMessage): boolean {
  const type = inferTelegramChatType(chat, message);
  return type === "group" || type === "supergroup";
}

function userPhotoQuery(chat: TelegramChat): URLSearchParams {
  const qs = new URLSearchParams();
  if (chat.business_connection_id) {
    qs.set("business", "1");
  } else if (chat.bot_integration_id) {
    qs.set("bot_id", chat.bot_integration_id);
  } else {
    qs.set("business", "1");
  }
  return qs;
}

const photoFileIdCache = new Map<string, Promise<string | null>>();

function photoCacheKey(telegramUserId: number | string, chat: TelegramChat): string {
  return `${chat.id}:${telegramUserId}`;
}

/** Resolve a group member's profile-photo `file_id` (Bot API path). */
export async function fetchTelegramUserPhotoFileId(
  telegramUserId: number | string,
  chat: TelegramChat,
): Promise<string | null> {
  if (isTelegramAccountChat(chat)) {
    return null;
  }

  const cacheKey = photoCacheKey(telegramUserId, chat);
  const cached = photoFileIdCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    try {
      const res = await fetch(
        `${env.apiBaseUrl}/telegram-media/user-photo/${encodeURIComponent(String(telegramUserId))}?${userPhotoQuery(chat)}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { file_id?: string | null };
      return typeof data.file_id === "string" && data.file_id.trim() ? data.file_id : null;
    } catch {
      return null;
    }
  })();

  photoFileIdCache.set(cacheKey, request);
  return request;
}

/** Turn a resolved `file_id` into a proxied `<img src>` URL. */
export function telegramUserPhotoMediaUrl(fileId: string, chat: TelegramChat): string | null {
  const isAccountChat = chat.source === "user_account" || Boolean(chat.user_session_id);
  if (isAccountChat) {
    return `${env.apiBaseUrl}/telegram-media/account/${encodeURIComponent(chat.id)}/${encodeURIComponent(fileId)}`;
  }
  if (chat.business_connection_id) {
    return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?business=1`;
  }
  const botId = chat.bot_integration_id;
  if (botId) {
    return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?bot_id=${encodeURIComponent(botId)}`;
  }
  return `${env.apiBaseUrl}/telegram-media/${encodeURIComponent(fileId)}?business=1`;
}

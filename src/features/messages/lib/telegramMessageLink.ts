import { resolveTelegramMessageForumTopicId } from "@/features/messages/lib/telegramTopics";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

type TelegramPeerChat = {
  id?: number;
  username?: string | null;
};

/** Strip the Bot API `-100` prefix for `t.me/c/{id}/…` private links. */
export function toTelegramInternalChatId(telegramChatId: number): string {
  const n = Math.abs(Math.trunc(telegramChatId));
  const digits = String(n);
  if (digits.startsWith("100") && digits.length > 10) {
    return digits.slice(3);
  }
  return digits;
}

function peerChatFromMessage(message: TelegramMessage): TelegramPeerChat | null {
  const td = message.telegram_data;
  if (!td || typeof td !== "object") return null;
  const chat = (td as Record<string, unknown>).chat;
  if (!chat || typeof chat !== "object") return null;
  const record = chat as Record<string, unknown>;
  return {
    id: typeof record.id === "number" && Number.isFinite(record.id) ? record.id : undefined,
    username: typeof record.username === "string" ? record.username : null,
  };
}

function resolveTelegramChatId(chat: TelegramChat, message: TelegramMessage): number | null {
  if (typeof chat.telegram_chat_id === "number" && Number.isFinite(chat.telegram_chat_id)) {
    return chat.telegram_chat_id;
  }
  return peerChatFromMessage(message)?.id ?? null;
}

function resolvePublicUsername(chat: TelegramChat, message: TelegramMessage): string | null {
  const fromChat = chat.username?.replace(/^@/, "").trim();
  if (fromChat) return fromChat;
  const fromMessage = peerChatFromMessage(message)?.username?.replace(/^@/, "").trim();
  return fromMessage || null;
}

/** Build a shareable `t.me/…` deep link for a synced Telegram message. */
export function buildTelegramMessageLink(chat: TelegramChat, message: TelegramMessage): string | null {
  const messageId = message.telegram_message_id;
  if (messageId == null || !Number.isFinite(messageId)) return null;

  const telegramChatId = resolveTelegramChatId(chat, message);
  if (telegramChatId == null) return null;

  const username = resolvePublicUsername(chat, message);
  const topicId = resolveTelegramMessageForumTopicId(message);
  const includeTopic = topicId != null && topicId !== 1;

  if (username) {
    const base = `https://t.me/${username}`;
    return includeTopic ? `${base}/${topicId}/${messageId}` : `${base}/${messageId}`;
  }

  const internalChatId = toTelegramInternalChatId(telegramChatId);
  const base = `https://t.me/c/${internalChatId}`;
  return includeTopic ? `${base}/${topicId}/${messageId}` : `${base}/${messageId}`;
}

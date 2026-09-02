import { toTelegramInternalChatId } from "@/features/messages/lib/telegramMessageLink";

export interface TelegramMessageDeepLink {
  /** Digits-only chat id as used in `t.me/c/{id}/…` links (no `-100` prefix). */
  internalChatId: string;
  messageId: number;
}

/** Parse a `t.me/c/…/…` URL or `internalChatId/messageId` pair into a deep-link target. */
export function parseTelegramMessageDeepLink(input: string | null | undefined): TelegramMessageDeepLink | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/t\.me\/c\/(\d+)\/(\d+)/i);
  if (urlMatch) {
    const messageId = Number(urlMatch[2]);
    if (!Number.isFinite(messageId)) return null;
    return { internalChatId: urlMatch[1]!, messageId };
  }

  const pairMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (pairMatch) {
    const messageId = Number(pairMatch[2]);
    if (!Number.isFinite(messageId)) return null;
    return { internalChatId: pairMatch[1]!, messageId };
  }

  return null;
}

export function normalizeTelegramInternalChatId(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/\D/g, "") || NaN);
  if (!Number.isFinite(n)) return null;
  return toTelegramInternalChatId(n);
}

export function telegramChatMatchesDeepLink(
  telegramChatId: number | null | undefined,
  internalChatId: string,
): boolean {
  const normalized = normalizeTelegramInternalChatId(telegramChatId);
  const target = normalizeTelegramInternalChatId(internalChatId);
  return Boolean(normalized && target && normalized === target);
}

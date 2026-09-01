/** Matches phone tokens in plain text (not inside URLs). Supports 7–15 digits. */
export const PHONE_SPLIT_RE = /(\+?(?:\d[\d\s().\-]{5,13}\d|\d{7,14}))/g;

export function normalizePhoneForApi(raw: string): string {
  return raw.trim().replace(/[^\d+]/g, "");
}

export function normalizePhoneForTel(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function isPlausiblePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export interface PhoneNumberActions {
  onCreateContact: (phone: string) => void;
  onOpenTelegramDm: (phone: string) => void;
}

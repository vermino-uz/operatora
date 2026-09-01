import type { CannedResponseRow } from "@/features/canned-responses/types";
import { normalizeShortcut } from "@/features/canned-responses/types";

export function filterCannedByChannel(items: CannedResponseRow[], channel: "telegram"): CannedResponseRow[] {
  return items.filter(
    (r) =>
      r.is_active &&
      (Array.isArray(r.channels) ? r.channels : [])
        .map((c) => c.toLowerCase())
        .includes(channel),
  );
}

/** When the composer text is exactly `/shortcut`, returns the canned body to send. */
export function resolveCannedShortcut(draft: string, responses: CannedResponseRow[]): string | null {
  const m = draft.trim().match(/^\/([a-zA-Z0-9_-]+)$/);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const found = responses.find((r) => r.is_active && normalizeShortcut(r.shortcut) === key);
  return found?.body?.trim() ? found.body.trim() : null;
}

/** Prefix matches while typing `/gre…` for autocomplete. */
export function matchCannedPrefix(draft: string, responses: CannedResponseRow[]): CannedResponseRow[] {
  const m = draft.match(/^\/([a-zA-Z0-9_-]*)$/);
  if (!m) return [];
  const prefix = (m[1] ?? "").toLowerCase();
  return responses.filter((r) => {
    if (!r.is_active) return false;
    if (!prefix) return true;
    return normalizeShortcut(r.shortcut).startsWith(prefix);
  });
}

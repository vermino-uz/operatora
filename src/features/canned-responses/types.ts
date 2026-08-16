/**
 * Canned Responses — shortcut replies for chat channels (operators type
 * `/greeting` and it expands to the saved body). Traced from the old
 * frontend's `CannedResponsesSettings.tsx`, which reads/writes the
 * `canned_responses` table via `supabase.from()` — routed through the real
 * `POST /db/canned_responses/query` compat endpoint (`db-proxy`),
 * registered in `table-registry.ts` as `{ scope: 'workspace', writeRoles:
 * MANAGER_ROLES }`. Only `telegram` is a wired delivery channel today —
 * instagram/whatsapp/sms are selectable in the old UI but visibly
 * disabled ("soon"), reproduced identically here rather than guessing
 * those channels are live.
 */

export type CannedResponseChannel = "telegram" | "instagram" | "whatsapp" | "sms";

export interface CannedResponseRow {
  id: string;
  workspace_id: string;
  shortcut: string;
  body: string;
  channels: string[];
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CannedResponseInput {
  shortcut: string;
  body: string;
  channels: string[];
  is_active: boolean;
}

export const CHANNEL_OPTIONS: { id: CannedResponseChannel; label: string; enabled: boolean }[] = [
  { id: "telegram", label: "Telegram", enabled: true },
  { id: "instagram", label: "Instagram", enabled: false },
  { id: "whatsapp", label: "WhatsApp", enabled: false },
  { id: "sms", label: "SMS", enabled: false },
];

/** Normalize shortcut for storage (no leading slash, trimmed, lowercase) —
 * matches the old frontend's `normalizeCannedShortcut` exactly. */
export function normalizeShortcut(raw: string): string {
  return raw.trim().replace(/^\//, "").toLowerCase();
}

export function formatShortcut(shortcut: string): string {
  const s = normalizeShortcut(shortcut);
  return s ? `/${s}` : "";
}

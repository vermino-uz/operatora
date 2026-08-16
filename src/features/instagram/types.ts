/**
 * Instagram — traced from the old frontend's `InstagramIntegration.tsx`/
 * `useInstagramOAuthFlow.ts`/`InstagramCallback.tsx`/
 * `InstagramOAuthSelectDialog.tsx` against the real
 * `backend/src/instagram/instagram.controller.ts` (`/instagram/*`). A
 * genuine Meta OAuth integration (Instagram Business account via either
 * "Instagram Login" or "Facebook Login for Business" surfaces), not a
 * lookalike of Telegram's bot-token flow.
 *
 * Scoped to the settings-relevant subset (account connect/disconnect,
 * list, resubscribe webhook, static webhook-callback info) — matching the
 * sitemap subtitle ("Connect Instagram for direct message handling").
 * Conversations/messages/send/suggest-reply belong to the Messages
 * feature (`InstagramMessages.tsx`/`InstagramChannelPanel.tsx` in the old
 * frontend), out of scope here, same as Eskiz's chats/send being deferred
 * to Messages.
 */

export interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url: string | null;
  page_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export type InstagramOAuthFlow = "instagram_login" | "facebook_pages";

export interface InstagramOAuthUrlResult {
  authUrl: string;
}

export interface InstagramOAuthOption {
  page_id: string;
  page_name: string;
  instagram_username: string;
  instagram_name?: string | null;
  profile_picture_url?: string | null;
}

export type InstagramOAuthCallbackResult =
  | { requiresSelection: true; selectionToken: string; options: InstagramOAuthOption[] }
  | { requiresSelection: false; success: true; accounts: unknown[] };

export interface InstagramOAuthConnectResult {
  success: boolean;
  accounts: unknown[];
  webhook_subscribed?: boolean;
}

export const INSTAGRAM_OAUTH_MESSAGE = "operatora:instagram-oauth";

export type InstagramOAuthMessage =
  | { type: typeof INSTAGRAM_OAUTH_MESSAGE; status: "pending_selection"; selectionToken: string; options: InstagramOAuthOption[]; workspaceId?: string }
  | { type: typeof INSTAGRAM_OAUTH_MESSAGE; status: "success" }
  | { type: typeof INSTAGRAM_OAUTH_MESSAGE; status: "error"; message: string };

export function isInstagramOAuthMessage(data: unknown): data is InstagramOAuthMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === INSTAGRAM_OAUTH_MESSAGE
  );
}

/** Base64url state blob decode, mirroring the old frontend's `decodeOAuthState`
 * — the state itself is opaque and server-generated (`encodeState()` in
 * `instagram.service.ts`); the client only needs to read back the `popup`
 * flag it round-trips. */
export function decodeOAuthState<T extends Record<string, unknown>>(raw?: string | null): T | null {
  if (!raw) return null;
  try {
    const pad = "=".repeat((4 - (raw.length % 4)) % 4);
    const base64 = (raw + pad).replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.from(atob(base64), (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function openInstagramOAuthPopup(authUrl: string): Window | null {
  const w = 560;
  const h = 720;
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = Math.max(0, (screen.availLeft ?? 0) + (screen.availWidth - w) / 2);
  const top = Math.max(0, (screen.availTop ?? 0) + (screen.availHeight - h) / 2);
  const features = `popup=yes,width=${w},height=${h},left=${left},top=${top}`;
  return window.open(authUrl, "operatora-instagram-oauth", features);
}

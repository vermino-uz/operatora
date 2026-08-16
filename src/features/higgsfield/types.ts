/**
 * Higgsfield MCP settings section — `/higgsfield/*`.
 *
 * Traced from the old frontend's `HiggsfieldPanel.tsx` (Settings) against
 * the real `backend/src/higgsfield/higgsfield.controller.ts`. Confirmed
 * NOT a simple external-signup-only link: it's a real workspace-level OAuth
 * connection (DCR + PKCE against Higgsfield's own MCP OAuth server), the
 * same popup+poll shape already established for Google Calendar/Sheets in
 * this app (`lib/oauthPopup.ts`), just server-driven instead of client-
 * generated (`POST /higgsfield/connect` returns an `authorizeUrl` from the
 * backend, no `redirectUri` is sent by the client — the backend's own
 * `PUBLIC_BACKEND_URL`-derived callback is fixed server-side).
 *
 * Relationship to AI Chat's deferred `higgsfield_connect` card
 * (`src/features/chat/components/ChatCards.tsx`): PROGRESS.md's earlier
 * note ("renders a `registerUrl` external link, no job-status polling") was
 * a simplification — the real old-frontend chat card
 * (`HiggsfieldConnectCard.tsx`) already runs this SAME popup OAuth flow
 * inline in the chat surface, with `registerUrl` only as a secondary
 * "don't have an account yet" link alongside the real Connect button. This
 * settings section is genuinely the first-class home for connect/disconnect
 * — the chat card is a shortcut into the identical flow. Wiring the chat
 * card to actually run this OAuth popup (instead of just linking out) is a
 * real, traceable, but non-trivial change to `features/chat/` internals
 * (needs `startHiggsfieldConnect`/status query wiring inside the chat
 * card's own render path) — flagged as a finding for a future pass per the
 * brief's own scope guidance, not done in this settings-only pass.
 *
 * Job-status polling (`GET /higgsfield/jobs`, `POST /higgsfield/jobs/ack`)
 * belongs entirely to the AI Chat generation flow (already deferred there,
 * per PROGRESS.md) and is out of scope here — this section only manages
 * the account connection + balance display.
 */

export interface HiggsfieldStatus {
  connected: boolean;
  status: "none" | "pending" | "connected" | "error";
  serverUrl: string;
  connectedAt: string | null;
  /** Merged in by the backend's `GET /status` handler from `planAccess()` —
   * see `higgsfield.service.ts`'s `planAccess`. */
  higgsfieldMcpAccess?: "unlimited" | "unavailable" | "soon";
  planSlug?: "free" | "pro" | "max" | "corporate";
  access?: "full" | "grace" | "read_only";
  canUseHiggsfield?: boolean;
}

export interface HiggsfieldBalance {
  connected: boolean;
  ok?: boolean;
  text?: string;
  structured?: unknown;
}

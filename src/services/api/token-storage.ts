/**
 * Single seam for persisting the Bearer access/refresh tokens across page
 * reloads (auth transport decision: Bearer token, not httpOnly cookies —
 * see ARCHITECTURE.md "Open Questions — Resolved" #1).
 *
 * Also maintains a lightweight, non-sensitive "auth hint" cookie so
 * `proxy.ts` (which runs on the edge, before any JS executes and
 * therefore cannot read localStorage) can redirect unauthenticated users
 * away from protected routes without a flash of protected content. That
 * cookie is NEVER sent to the backend and NEVER used to authorize a
 * request — it only carries the boolean "was a token present at last
 * write", to avoid Next's middleware needing the real token. The real
 * token always travels as `Authorization: Bearer <token>` on API calls.
 */

const ACCESS_TOKEN_KEY = "operatora.accessToken";
const REFRESH_TOKEN_KEY = "operatora.refreshToken";
const AUTH_HINT_COOKIE = "auth-hint";

const isBrowser = typeof window !== "undefined";

function setAuthHintCookie(present: boolean): void {
  if (!isBrowser) return;
  if (present) {
    // Not httpOnly (must be readable/writable from client JS), not a
    // security boundary — 7 day cap just prevents a stale hint outliving
    // a long-expired refresh token indefinitely.
    document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  } else {
    document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(params: { accessToken: string; refreshToken: string }): void {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
    setAuthHintCookie(true);
  },

  /** Access-token-only update (post-refresh); refresh token is rotated
   * separately and only changes on a successful /auth/refresh call. */
  setAccessToken(accessToken: string): void {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setAuthHintCookie(true);
  },

  clear(): void {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAuthHintCookie(false);
  },
};

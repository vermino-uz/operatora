/**
 * Typed, validated environment access.
 *
 * `NEXT_PUBLIC_*` variables are inlined at build time by Next.js, so a
 * single build only ever targets one backend (test/beta/prod) — matching
 * the old system's separate per-environment deploy targets. Never read
 * `process.env.NEXT_PUBLIC_*` directly anywhere else in the app; import
 * from here so there is exactly one seam if the contract changes.
 */

function readRequired(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    // Fail fast and loud: a missing base URL should never silently resolve
    // to `undefined/api/...` and produce confusing network errors later.
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local / .env.<environment>.`,
    );
  }
  return value;
}

function deriveWsUrl(apiBaseUrl: string): string {
  // Strip a trailing /api (and any trailing slash) to get the origin the
  // Socket.io gateway listens on — it is mounted at `/`, not under /api.
  return apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
}

const rawApiBaseUrl = readRequired(
  "NEXT_PUBLIC_API_BASE_URL",
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

export const env = {
  /** e.g. https://test.operatora.ai/api or https://operatora.ai/api */
  apiBaseUrl: rawApiBaseUrl.replace(/\/+$/, ""),
  /** e.g. https://test.operatora.ai — falls back to derived value from apiBaseUrl. */
  wsUrl: (process.env.NEXT_PUBLIC_WS_URL ?? "").trim() || deriveWsUrl(rawApiBaseUrl),
  isProduction: process.env.NODE_ENV === "production",
} as const;

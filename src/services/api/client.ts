import { env } from "@/config/env";
import { ApiError, type RawApiErrorBody } from "@/types/api";
import { tokenStorage } from "@/services/api/token-storage";

const DEFAULT_TIMEOUT_MS = 20_000;
const SESSION_SUPERSEDED_MARKER = "SESSION_SUPERSEDED";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable body. For file uploads, pass a `FormData` here
   * instead and it will be sent as-is (no Content-Type header forced). */
  body?: unknown;
  /** Skip attaching the Authorization header (public endpoints). */
  public?: boolean;
  /** Skip the automatic 401 -> refresh -> retry flow (used by the auth
   * endpoints themselves to avoid recursion/loops). */
  skipAuthRetry?: boolean;
  timeoutMs?: number;
}

/**
 * Callback wired up by the session store at app bootstrap. Called whenever
 * the client determines the session cannot be recovered (refresh failed, or
 * the backend signaled SESSION_SUPERSEDED) — mirrors the old frontend's
 * deterministic single-session-eviction backstop.
 */
let forceLogoutHandler: ((reason: string) => void) | null = null;
export function registerForceLogoutHandler(handler: (reason: string) => void): void {
  forceLogoutHandler = handler;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseErrorBody(response: Response): Promise<RawApiErrorBody | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as RawApiErrorBody;
  } catch {
    return null;
  }
}

function messageToString(message: string | string[] | undefined, fallback: string): string {
  if (!message) return fallback;
  return Array.isArray(message) ? message.join(" ") : message;
}

/** Builds the normalized `ApiError` for a non-ok response. */
async function toApiError(response: Response): Promise<ApiError> {
  const body = await parseErrorBody(response);
  return new ApiError({
    statusCode: response.status,
    message: messageToString(body?.message, response.statusText || "Request failed"),
    code: body?.code,
    path: body?.path,
    timestamp: body?.timestamp,
  });
}

/**
 * Low-level request — no auth-retry loop, no token injection beyond what
 * the caller explicitly passes. Used by the auth endpoints (login/refresh)
 * that must not recurse into the 401-retry logic below.
 */
export async function rawRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, timeoutMs, public: _public, skipAuthRetry: _skip, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // Combine caller-provided signal (e.g. React Query's) with our timeout.
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData(body)) {
      finalBody = body;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    throw new ApiError({
      statusCode: 0,
      message: aborted ? "Request timed out." : "Network error — check your connection.",
      isNetworkError: true,
    });
  }
  clearTimeout(timeout);

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// --- Single-flight refresh mutex -------------------------------------------------
// N concurrent 401s must trigger exactly one /auth/refresh call, mirroring
// the backend's single-session/refresh-rotation model and avoiding a
// refresh-token race (see ARCHITECTURE.md "Network-Flood Prevention").
let inFlightRefresh: Promise<string | null> | null = null;

/** Exported for the AI Chat SSE streaming client (`services/api/chat.ts`),
 * which can't go through `apiFetch`/`rawRequest` (they buffer+JSON-parse the
 * whole body) but still needs to share this single-flight refresh mutex
 * rather than duplicating the refresh call. */
export async function performTokenRefresh(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const session = await rawRequest<{ access_token: string; refresh_token: string }>(
        "/auth/refresh",
        { method: "POST", body: { refresh_token: refreshToken }, public: true, skipAuthRetry: true },
      );
      tokenStorage.setTokens({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      return session.access_token;
    } catch {
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

/**
 * The general-purpose API client. Every feature/service call goes through
 * this — no component or hook is allowed to call `fetch` directly (single
 * seam for auth headers, error shape, and the flood-prevention mechanisms
 * above).
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.public) {
    const token = tokenStorage.getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await rawRequest<T>(path, { ...options, headers });
  } catch (err) {
    if (!(err instanceof ApiError) || err.statusCode !== 401 || options.skipAuthRetry) {
      throw err;
    }

    // Re-fetch the raw response once to inspect the body for the
    // SESSION_SUPERSEDED marker before deciding whether a refresh could
    // even help — a superseded session's refresh token is already revoked
    // server-side, so retrying refresh would just burn a request.
    // (err carries the parsed message already — cheaper to check here.)
    if (err.message.includes(SESSION_SUPERSEDED_MARKER)) {
      tokenStorage.clear();
      forceLogoutHandler?.("superseded");
      throw err;
    }

    const newToken = await performTokenRefresh();
    if (!newToken) {
      tokenStorage.clear();
      forceLogoutHandler?.("unauthorized");
      throw err;
    }

    const retryHeaders = new Headers(options.headers);
    retryHeaders.set("Authorization", `Bearer ${newToken}`);
    return rawRequest<T>(path, { ...options, headers: retryHeaders, skipAuthRetry: true });
  }
}

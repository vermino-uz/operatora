import { apiFetch, rawRequest } from "@/services/api/client";
import { tokenStorage } from "@/services/api/token-storage";
import type { AuthMe, AuthSession } from "@/types/entities";

export interface LoginPayload {
  /** Email address OR phone number — wire-compatible field name from the
   * old API (`LoginDto.email` accepts either). */
  email: string;
  password: string;
}

/** Full session response including `refresh_token`, used once at login time
 * to seed token storage. Not re-exported — feature code only ever sees
 * `AuthSession` (no refresh_token) via `authApi.login`'s return type. */
interface LoginResponse extends AuthSession {
  refresh_token: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const session = await rawRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      public: true,
      skipAuthRetry: true,
    });
    tokenStorage.setTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    return session;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST", skipAuthRetry: true });
    } finally {
      // Always clear local tokens even if the network call fails (offline,
      // server error) — a user asking to log out must end up logged out
      // locally regardless of backend reachability.
      tokenStorage.clear();
    }
  },

  async me(): Promise<AuthMe> {
    return apiFetch<AuthMe>("/auth/me", { method: "GET" });
  },
};

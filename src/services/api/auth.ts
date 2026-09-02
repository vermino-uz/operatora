import { apiFetch, rawRequest } from "@/services/api/client";
import { tokenStorage } from "@/services/api/token-storage";
import { normalizeAuthMe, normalizeSessionUser } from "@/features/auth/lib/normalizeAuth";
import type { AccountType, AuthMe, AuthSession } from "@/types/entities";

export interface LoginPayload {
  /** Email address OR phone number — wire-compatible field name from the
   * old API (`LoginDto.email` accepts either). */
  email: string;
  password: string;
}

export interface RegisterPayload {
  phone: string;
  otpCode: string;
  password: string;
  fullName?: string;
}

export interface RequestOtpPayload {
  phone: string;
  purpose: "signup" | "reset";
}

export interface SetAccountTypePayload {
  account_type: AccountType;
}

/** Full session response including `refresh_token`, used once at login time
 * to seed token storage. Not re-exported — feature code only ever sees
 * `AuthSession` (no refresh_token) via `authApi.login`'s return type. */
interface LoginResponse extends AuthSession {
  refresh_token: string;
}

function normalizeAuthSession(raw: Record<string, unknown>): AuthSession {
  const userRaw = raw.user;
  const user =
    userRaw && typeof userRaw === "object"
      ? normalizeSessionUser(userRaw as Record<string, unknown>)
      : normalizeSessionUser(raw);

  return {
    access_token: String(raw.access_token),
    user,
    roles: (raw.roles as AuthSession["roles"]) ?? [],
    workspaceId: raw.workspaceId as string | undefined,
  };
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const session = await rawRequest<LoginResponse & Record<string, unknown>>("/auth/login", {
      method: "POST",
      body: payload,
      public: true,
      skipAuthRetry: true,
    });
    tokenStorage.setTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    return normalizeAuthSession(session);
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const session = await rawRequest<LoginResponse & Record<string, unknown>>("/auth/register", {
      method: "POST",
      body: {
        phone: payload.phone,
        otpCode: payload.otpCode,
        password: payload.password,
        fullName: payload.fullName,
      },
      public: true,
      skipAuthRetry: true,
    });
    tokenStorage.setTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    return normalizeAuthSession(session);
  },

  async requestOtp(payload: RequestOtpPayload): Promise<void> {
    await rawRequest<{ ok: true }>("/auth/otp/request", {
      method: "POST",
      body: payload,
      public: true,
      skipAuthRetry: true,
    });
  },

  async setAccountType(payload: SetAccountTypePayload): Promise<AuthMe> {
    const raw = await apiFetch<Record<string, unknown>>("/auth/account-type", {
      method: "PUT",
      body: payload,
    });
    return normalizeAuthMe(raw);
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST", skipAuthRetry: true });
    } finally {
      tokenStorage.clear();
    }
  },

  async me(): Promise<AuthMe> {
    const raw = await apiFetch<Record<string, unknown>>("/auth/me", { method: "GET" });
    return normalizeAuthMe(raw);
  },
};

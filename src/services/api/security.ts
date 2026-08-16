import { apiFetch } from "@/services/api/client";
import type { SecuritySession } from "@/features/security/types";

export const securityApi = {
  async changePassword(current_password: string, new_password: string): Promise<void> {
    await apiFetch<{ success: true }>(`/security/change-password`, {
      method: "POST",
      body: { current_password, new_password },
    });
  },

  async listSessions(): Promise<SecuritySession[]> {
    const res = await apiFetch<{ sessions: SecuritySession[] }>(`/security/sessions`);
    return res.sessions;
  },

  /** Revokes ALL of the caller's active sessions, including the one making
   * this request — the backend has no "revoke everything but this one"
   * variant. Callers must force a local logout immediately after this
   * succeeds. */
  async forceLogout(): Promise<void> {
    await apiFetch<{ success: true }>(`/security/force-logout`, { method: "POST" });
  },

  async requestPhoneOtp(phone: string): Promise<void> {
    await apiFetch<{ success: true }>(`/security/phone/request-otp`, {
      method: "POST",
      body: { phone },
    });
  },

  async confirmPhoneChange(phone: string, otpCode: string): Promise<{ phone: string }> {
    return apiFetch<{ success: true; phone: string }>(`/security/phone/confirm`, {
      method: "POST",
      body: { phone, otp_code: otpCode },
    });
  },
};

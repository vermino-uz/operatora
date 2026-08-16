import { apiFetch } from "@/services/api/client";
import type { GoogleCalendarStatus } from "@/features/google-calendar/types";

/** `/google-calendar/*` — per-operator connection, workspace+user derived
 * from the JWT (`JwtAuthGuard` + `CurrentUser`), no `workspace_id` param. */
export const googleCalendarApi = {
  async status(): Promise<GoogleCalendarStatus> {
    return apiFetch<GoogleCalendarStatus>("/google-calendar/status");
  },

  async getOAuthUrl(redirectUri: string): Promise<{ authUrl: string }> {
    return apiFetch<{ authUrl: string }>(
      `/google-calendar/oauth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
  },

  async completeOAuth(input: { code: string; state?: string; redirect_uri: string }): Promise<{
    success: boolean;
    google_email: string | null;
  }> {
    return apiFetch<{ success: boolean; google_email: string | null }>("/google-calendar/oauth-callback", {
      method: "POST",
      body: input,
    });
  },

  async disconnect(): Promise<void> {
    await apiFetch<unknown>("/google-calendar/disconnect", { method: "DELETE" });
  },
};

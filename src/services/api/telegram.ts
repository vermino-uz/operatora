import { apiFetch } from "@/services/api/client";
import type {
  TelegramIntegration,
  TelegramTestResult,
  TelegramWebhookInfoResult,
} from "@/features/telegram/types";

/**
 * `/telegram-integration/*` — see `features/telegram/types.ts` for the
 * full contract trace. `workspace_id` is only meaningful on `create`
 * (the backend overwrites it with the caller's JWT workspace regardless
 * of what's sent, but the DTO still requires the field); `update` never
 * sends `workspace_id` since the backend's update path applies the raw
 * body to the row (`.update(dto)`) without stripping it first.
 */
export const telegramApi = {
  async list(): Promise<TelegramIntegration[]> {
    const data = await apiFetch<TelegramIntegration[]>("/telegram-integration");
    return Array.isArray(data) ? data : [];
  },

  async create(workspaceId: string, botToken: string): Promise<TelegramIntegration> {
    return apiFetch("/telegram-integration", {
      method: "POST",
      body: { workspace_id: workspaceId, bot_token: botToken, is_active: false },
    });
  },

  async updateBotToken(id: string, botToken: string): Promise<TelegramIntegration> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { bot_token: botToken },
    });
  },

  async remove(id: string): Promise<{ success: true }> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async test(id: string): Promise<TelegramTestResult> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}/test`, { method: "POST" });
  },

  async setWebhook(id: string): Promise<{ success: true; message: string; webhook_url: string }> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}/set-webhook`, {
      method: "POST",
      body: {},
    });
  },

  async removeWebhook(id: string): Promise<{ success: true; message: string }> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}/remove-webhook`, {
      method: "POST",
      body: {},
    });
  },

  async webhookInfo(id: string): Promise<TelegramWebhookInfoResult> {
    return apiFetch(`/telegram-integration/${encodeURIComponent(id)}/webhook-info`, {
      method: "GET",
    });
  },
};

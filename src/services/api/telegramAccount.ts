import { apiFetch } from "@/services/api/client";
import { tokenStorage } from "@/services/api/token-storage";
import { env } from "@/config/env";
import type { TelegramForumTopic } from "@/features/messages/types";

export type TelegramAccountProtocol = "pyrogram" | "tdlib";
export type TelegramConnectionMode = "business_bot" | "user_account";

export interface TelegramAccountSession {
  id: string;
  telegram_user_id?: number | null;
  telegram_username?: string | null;
  phone_masked?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_checked_at?: string | null;
  status?: string | null;
  protocol?: TelegramAccountProtocol | null;
  last_sync_at?: string | null;
}

export interface TelegramAccountSettings {
  connection_mode: TelegramConnectionMode;
  session: TelegramAccountSession | null;
  protocol: TelegramAccountProtocol;
  worker_configured?: boolean;
  worker_online?: boolean;
  worker_ready?: boolean;
}

export interface TelegramAccountFolder {
  id: string;
  remote_folder_id: number;
  name: string;
  icon_name?: string | null;
}

export interface TelegramPhoneCheckResult {
  has_telegram: boolean;
  telegram_user_id?: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface TelegramAccountContact {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  phone?: string | null;
  is_bot?: boolean;
}

export interface TelegramChatLastSeen {
  status?: string | null;
  last_online_date?: number | null;
}

/** `/telegram-account/*` — linked user-account (userbot) layer, traced against
 * `telegram-account.controller.ts`. Distinct from bot integration settings
 * (`/telegram-integration/*`) and the inbox list/send endpoints. */
export const telegramAccountApi = {
  async getSettings(): Promise<TelegramAccountSettings> {
    return apiFetch<TelegramAccountSettings>("/telegram-account/settings");
  },

  async listFolders(): Promise<TelegramAccountFolder[]> {
    const data = await apiFetch<TelegramAccountFolder[]>("/telegram-account/folders");
    return Array.isArray(data) ? data : [];
  },

  async listContacts(force = false): Promise<TelegramAccountContact[]> {
    const qs = force ? "?force=1" : "";
    const data = await apiFetch<TelegramAccountContact[]>(`/telegram-account/contacts${qs}`);
    return Array.isArray(data) ? data : [];
  },

  async addContact(payload: { phone: string; first_name?: string; last_name?: string }): Promise<unknown> {
    return apiFetch("/telegram-account/contacts/add", {
      method: "POST",
      body: {
        phone: payload.phone,
        first_name: payload.first_name,
        last_name: payload.last_name,
      },
    });
  },

  async editContact(payload: { user_id: number; first_name: string; last_name?: string }): Promise<unknown> {
    return apiFetch("/telegram-account/contacts/edit", {
      method: "POST",
      body: payload,
    });
  },

  async startChatByPhone(payload: {
    phone: string;
    first_name?: string;
    last_name?: string;
    keep_contact?: boolean;
  }): Promise<{ chat?: { id: string } }> {
    return apiFetch("/telegram-account/start-chat-by-phone", {
      method: "POST",
      body: payload,
    });
  },

  async checkPhone(phone: string): Promise<TelegramPhoneCheckResult> {
    return apiFetch<TelegramPhoneCheckResult>("/telegram-account/check-phone", {
      method: "POST",
      body: { phone },
    });
  },

  async startChatById(userId: number): Promise<{ chat?: { id: string } }> {
    return apiFetch("/telegram-account/start-chat-by-id", {
      method: "POST",
      body: { user_id: userId },
    });
  },

  async getLastSeen(chatId: string): Promise<TelegramChatLastSeen> {
    return apiFetch<TelegramChatLastSeen>(`/telegram-account/chats/${encodeURIComponent(chatId)}/last-seen`);
  },

  async syncInbox(): Promise<unknown> {
    return apiFetch("/telegram-account/sync", { method: "POST" });
  },

  async disconnect(deleteConversations = false): Promise<unknown> {
    return apiFetch("/telegram-account/disconnect", {
      method: "POST",
      body: { delete_conversations: deleteConversations },
    });
  },

  async loginStart(phone: string, protocol: TelegramAccountProtocol): Promise<{ loginId: string }> {
    return apiFetch("/telegram-account/login/start", {
      method: "POST",
      body: { phone, protocol },
    });
  },

  async loginVerify(payload: {
    loginId: string;
    code: string;
    password?: string;
    protocol: TelegramAccountProtocol;
  }): Promise<unknown> {
    return apiFetch("/telegram-account/login/verify", {
      method: "POST",
      body: payload,
    });
  },

  async loginQrStart(protocol: TelegramAccountProtocol): Promise<{ loginId: string; qrUrl: string }> {
    return apiFetch("/telegram-account/login/qr/start", {
      method: "POST",
      body: { protocol },
    });
  },

  async loginQrWait(payload: {
    loginId: string;
    timeoutSec?: number;
    protocol: TelegramAccountProtocol;
  }): Promise<{ status: number; data: { pending?: boolean; qrUrl?: string; message?: string } }> {
    const token = tokenStorage.getAccessToken();
    const res = await fetch(`${env.apiBaseUrl}/telegram-account/login/qr/wait`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { pending?: boolean; qrUrl?: string; message?: string };
    return { status: res.status, data };
  },

  async loginQrPassword(payload: {
    loginId: string;
    password: string;
    protocol: TelegramAccountProtocol;
  }): Promise<unknown> {
    return apiFetch("/telegram-account/login/qr/password", {
      method: "POST",
      body: payload,
    });
  },

  /** `GET /telegram-account/chats/:chatId/topics` — forum topics for a
   * supergroup (TDLib linked account only; 400 for Pyrogram or non-forum). */
  async listGroupTopics(chatId: string): Promise<{ topics: TelegramForumTopic[] }> {
    return apiFetch(`/telegram-account/chats/${encodeURIComponent(chatId)}/topics`);
  },

  async createGroupTopic(chatId: string, name: string): Promise<{ forum_topic_id: number; name: string }> {
    return apiFetch(`/telegram-account/chats/${encodeURIComponent(chatId)}/topics`, {
      method: "POST",
      body: { name },
    });
  },

  async renameGroupTopic(chatId: string, topicId: number, name: string): Promise<{ ok: boolean; name: string }> {
    return apiFetch(`/telegram-account/chats/${encodeURIComponent(chatId)}/topics/${topicId}/rename`, {
      method: "POST",
      body: { name },
    });
  },

  async setGroupTopicClosed(
    chatId: string,
    topicId: number,
    isClosed: boolean,
  ): Promise<{ ok: boolean; is_closed: boolean }> {
    return apiFetch(`/telegram-account/chats/${encodeURIComponent(chatId)}/topics/${topicId}/close`, {
      method: "POST",
      body: { is_closed: isClosed },
    });
  },

  async deleteGroupTopic(chatId: string, topicId: number): Promise<{ ok: boolean }> {
    return apiFetch(`/telegram-account/chats/${encodeURIComponent(chatId)}/topics/${topicId}`, {
      method: "DELETE",
    });
  },
};

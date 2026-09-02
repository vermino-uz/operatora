import { apiFetch } from "@/services/api/client";
import type { InstagramChat, InstagramMessage } from "@/features/messages/types";

/**
 * Messages — Instagram channel. Traced directly against
 * `instagram.controller.ts` (`/instagram/conversations*`, `/instagram/
 * send-message`). Workspace is derived from the JWT (`user.workspaceId`),
 * no `workspace_id` param on any of these routes. Scoped to read+send
 * text — see `features/messages/types.ts` for what's deliberately not
 * built (media send, groups, automations, AI "suggest reply").
 */
export const instagramConversationsApi = {
  /** `GET /instagram/conversations` — every DM conversation, no
   * pagination params on this route (confirmed in the controller).
   * Response is `{ conversations: [...] }`, not a bare array (confirmed
   * directly in `instagram.service.ts`'s `getConversations()` return
   * type) — every method on this object unwraps its own envelope for the
   * same reason; without it every one of these silently returned empty. */
  async list(): Promise<InstagramChat[]> {
    const data = await apiFetch<{ conversations?: InstagramChat[] }>(`/instagram/conversations`);
    return Array.isArray(data?.conversations) ? data.conversations : [];
  },

  /** `GET /instagram/conversations/:id/messages` — response is
   * `{ messages: [...] }`. */
  async listMessages(conversationId: string): Promise<InstagramMessage[]> {
    const data = await apiFetch<{ messages?: InstagramMessage[] }>(
      `/instagram/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    return Array.isArray(data?.messages) ? data.messages : [];
  },

  /** `POST /instagram/send-message` — text only. Requires `instagram`/
   * `create` RBAC permission server-side. Response is
   * `{ success, message }`. */
  async send(payload: {
    conversationId: string;
    text: string;
    senderId?: string | null;
  }): Promise<InstagramMessage | undefined> {
    const body: Record<string, unknown> = {
      conversation_id: payload.conversationId,
      text: payload.text,
    };
    if (payload.senderId) body.sender_id = payload.senderId;
    const data = await apiFetch<{ success?: boolean; message?: InstagramMessage }>(`/instagram/send-message`, {
      method: "POST",
      body,
    });
    return data?.message;
  },

  /** `POST /instagram/conversations/:id/link-lead` — pass `null` to
   * unlink. Response is `{ success, conversation }`. */
  async linkLead(conversationId: string, leadId: string | null): Promise<InstagramChat | undefined> {
    const data = await apiFetch<{ success?: boolean; conversation?: InstagramChat }>(
      `/instagram/conversations/${encodeURIComponent(conversationId)}/link-lead`,
      { method: "POST", body: { lead_id: leadId } },
    );
    return data?.conversation;
  },
};

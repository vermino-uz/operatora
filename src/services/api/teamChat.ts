import { apiFetch } from "@/services/api/client";
import type { TeamChatChannel, TeamChatFeed } from "@/features/messages/types";

/**
 * Messages — Team Chat (internal workspace chat, distinct from the
 * Telegram/Instagram/SMS customer-channel inbox). Traced directly against
 * `messages-page/group-chat.controller.ts` (`/messages-page/group-chat*`).
 * Unlike every other controller this app talks to, this one does not use
 * `JwtAuthGuard`/`@CurrentUser()` — it manually decodes the Bearer token
 * (`extractSupabaseTokenOrHeader`) and expects `workspace_id` as an
 * explicit query/body param rather than deriving it from the JWT, so every
 * call here passes it explicitly (confirmed compatible with this app's
 * standard `apiFetch` Bearer-header transport either way).
 *
 * Scoped to: channel list + `#general` default, message list (with the
 * `profiles` sender-name lookup the backend returns alongside), and
 * plain-text send. Not built (real endpoints, out of scope for this pass):
 * channel create/update (pin/archive/rename/write_roles — admin-only
 * channel management), attachment upload (`POST .../upload`), message
 * edit/delete, @mention-triggered notifications.
 */
export const teamChatApi = {
  /** `GET /messages-page/group-chat/channels`. */
  async listChannels(workspaceId: string): Promise<TeamChatChannel[]> {
    const data = await apiFetch<TeamChatChannel[]>(
      `/messages-page/group-chat/channels?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(data) ? data : [];
  },

  /** `GET /messages-page/group-chat` — returns `{ messages, profiles }`;
   * `channelId` omitted resolves to the workspace's `#general` channel. */
  async listMessages(workspaceId: string, channelId?: string): Promise<TeamChatFeed> {
    const qs = new URLSearchParams({ workspace_id: workspaceId });
    if (channelId) qs.set("channel_id", channelId);
    const data = await apiFetch<TeamChatFeed>(`/messages-page/group-chat?${qs.toString()}`);
    return { messages: Array.isArray(data?.messages) ? data.messages : [], profiles: Array.isArray(data?.profiles) ? data.profiles : [] };
  },

  /** `POST /messages-page/group-chat` — plain text only in this pass. */
  async send(payload: { workspaceId: string; channelId?: string; content: string }): Promise<void> {
    await apiFetch(`/messages-page/group-chat`, {
      method: "POST",
      body: { workspace_id: payload.workspaceId, channel_id: payload.channelId, content: payload.content },
    });
  },
};

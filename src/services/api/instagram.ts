import { apiFetch } from "@/services/api/client";
import type {
  InstagramAccount,
  InstagramOAuthCallbackResult,
  InstagramOAuthConnectResult,
  InstagramOAuthFlow,
  InstagramOAuthUrlResult,
} from "@/features/instagram/types";

/** `/instagram/*` — see `features/instagram/types.ts` for the full contract trace. */
export const instagramApi = {
  async getAccounts(): Promise<InstagramAccount[]> {
    const data = await apiFetch<{ accounts: InstagramAccount[] }>("/instagram/accounts");
    return Array.isArray(data?.accounts) ? data.accounts : [];
  },

  async getOAuthUrl(params: {
    workspaceId: string;
    userId: string;
    flow?: InstagramOAuthFlow;
    popup?: boolean;
  }): Promise<InstagramOAuthUrlResult> {
    const query = new URLSearchParams({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      popup: params.popup === false ? "0" : "1",
    });
    if (params.flow) query.set("flow", params.flow);
    return apiFetch(`/instagram/oauth-url?${query}`);
  },

  async oauthCallback(body: {
    code: string;
    state?: string;
    userId?: string;
    workspaceId?: string;
  }): Promise<InstagramOAuthCallbackResult> {
    return apiFetch("/instagram/oauth-callback", {
      method: "POST",
      body: { code: body.code, state: body.state, user_id: body.userId, workspace_id: body.workspaceId },
    });
  },

  async oauthConnect(body: {
    selectionToken: string;
    pageId: string;
    userId?: string;
    workspaceId?: string;
  }): Promise<InstagramOAuthConnectResult> {
    return apiFetch("/instagram/oauth-connect", {
      method: "POST",
      body: {
        selection_token: body.selectionToken,
        page_id: body.pageId,
        user_id: body.userId,
        workspace_id: body.workspaceId,
      },
    });
  },

  async resubscribe(accountId: string): Promise<{ success: boolean; webhook_subscribed: boolean }> {
    return apiFetch(`/instagram/accounts/${encodeURIComponent(accountId)}/resubscribe`, { method: "POST" });
  },

  async disconnect(accountId: string, deleteConversations: boolean): Promise<{ success: true; deleted_conversations: number }> {
    return apiFetch(`/instagram/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
      body: { delete_conversations: deleteConversations },
    });
  },
};

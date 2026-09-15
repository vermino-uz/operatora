import { apiFetch } from "@/services/api/client";

/**
 * Social Media Advisor chat — `POST /api/fn/social-media-advisor`. Traced
 * to `FunctionsController.dispatch('social-media-advisor')` ->
 * `FunctionsHandlersService.aiChatHandler('social-media', body, user)` ->
 * `AiChatService.chat()` (`chatMode: 'social-media'`) — the same unified
 * chat service backing AI Mentor / Lead AI Assist, with
 * `MODE_CONFIG['social-media']`'s system prompt ("post ideas, headlines,
 * hashtags, schedule suggestions"). Plain `{reply, threadId, model}`
 * response, same as `ai-mentor` (no special-casing in
 * `aiChatHandler` for this mode).
 *
 * NOTE: this is a generic advice chat, NOT the old frontend's
 * `{action: 'analyze_conversations' | 'generate_content_ideas' |
 * 'get_content_ideas'}` payload shape — see the doc comment in
 * `features/social-media-advisor/types.ts` for why that flow is a
 * confirmed, unworkable backend gap and was dropped rather than faked.
 */
export interface SocialMediaAdvisorChatRequest {
  message: string;
  threadId?: string;
  chatHistory: Array<{ type: "user" | "assistant"; content: string }>;
}

export interface SocialMediaAdvisorChatResponse {
  reply: string;
  threadId?: string;
  model: string;
}

export const socialMediaAdvisorApi = {
  async send(body: SocialMediaAdvisorChatRequest): Promise<SocialMediaAdvisorChatResponse> {
    return apiFetch<SocialMediaAdvisorChatResponse>("/fn/social-media-advisor", {
      method: "POST",
      body,
    });
  },
};

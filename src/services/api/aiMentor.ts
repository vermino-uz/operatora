import { apiFetch } from "@/services/api/client";

/**
 * AI Mentor — `POST /api/fn/ai-mentor`. Traced to
 * `FunctionsController.dispatch('ai-mentor')` ->
 * `FunctionsHandlersService.aiChatHandler('mentor', body, user)` ->
 * `AiChatService.chat()` (`chatMode: 'mentor'`) — the same unified chat
 * service backing Lead AI Assist / Conversation AI Assistant (see
 * `services/api/leadAiAssist.ts`), just a different mode/system prompt
 * (coaching-focused, per `MODE_CONFIG.mentor` in `ai-chat.service.ts`).
 * Unlike `lead-assist`, `FunctionsHandlersService.aiChatHandler` does NOT
 * special-case `mentor` — the response is the plain `{reply, threadId,
 * model}` shape straight from `AiChatService.chat()`.
 */
export interface AiMentorRequest {
  message: string;
  threadId?: string;
  chatHistory: Array<{ type: "user" | "assistant"; content: string }>;
}

export interface AiMentorResponse {
  reply: string;
  threadId?: string;
  model: string;
}

export const aiMentorApi = {
  async send(body: AiMentorRequest): Promise<AiMentorResponse> {
    return apiFetch<AiMentorResponse>("/fn/ai-mentor", {
      method: "POST",
      body,
    });
  },
};

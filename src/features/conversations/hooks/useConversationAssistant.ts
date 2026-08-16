"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { conversationAiAssistantApi } from "@/services/api/conversations";
import type { Conversation, ConversationAssistantMessage } from "@/features/conversations/types";

/** Trims the conversation row down to exactly the fields the backend's
 * `AiChatService.buildConversationContextBlock()` reads (see
 * `services/api/conversations.ts`'s contract comment) — no point shipping
 * the whole row (raw `entities` JSON, audio path, etc.) over the wire. */
function toAssistantContext(conversation: Conversation): Record<string, unknown> {
  return {
    client_name: conversation.client_name,
    operator_name: conversation.operator_name,
    conversation_date: conversation.conversation_date,
    conversation_time: conversation.conversation_time,
    duration: conversation.duration,
    duration_sec: conversation.duration_sec,
    ai_score: conversation.ai_score,
    sentiment: conversation.sentiment,
    status: conversation.status,
    summary: conversation.summary,
    key_points: conversation.key_points,
    transcript: conversation.transcript,
  };
}

/** Local (non-persisted) chat state for the "ask about this conversation"
 * panel — genuinely local UI state, not TanStack Query server state,
 * mirroring `useChatController`'s reasoning: this endpoint doesn't persist
 * a thread the way `/ai-chat/threads` does (no GET to resume from), it's a
 * synchronous request/response, and messages reset whenever the selected
 * conversation changes. */
export function useConversationAssistant(conversation: Conversation | null, workspaceId: string | null) {
  const [messages, setMessages] = useState<ConversationAssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const threadIdRef = useRef<string | undefined>(undefined);
  const conversationIdRef = useRef<string | null>(null);

  // Reset the thread whenever the selected conversation changes.
  useEffect(() => {
    if (conversation?.id !== conversationIdRef.current) {
      conversationIdRef.current = conversation?.id ?? null;
      threadIdRef.current = undefined;
      setMessages([]);
      setError(null);
    }
  }, [conversation?.id]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversation || isSending) return;

      const userMessage: ConversationAssistantMessage = {
        id: `local-${Date.now()}-u`,
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const history = messages.map((m) => ({
          type: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));

        const result = await conversationAiAssistantApi.send({
          message: trimmed,
          conversation: toAssistantContext(conversation),
          chatHistory: history,
          threadId: threadIdRef.current,
          workspaceId: workspaceId ?? undefined,
        });

        if (result.threadId) threadIdRef.current = result.threadId;

        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}-a`,
            role: "assistant",
            content: result.reply,
            ts: Date.now(),
          },
        ]);
      } catch (err) {
        setError(err);
      } finally {
        setIsSending(false);
      }
    },
    [conversation, isSending, messages, workspaceId],
  );

  return { messages, send, isSending, error };
}

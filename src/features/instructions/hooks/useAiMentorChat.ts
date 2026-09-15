"use client";

import { useCallback, useState } from "react";

import { aiMentorApi } from "@/services/api/aiMentor";

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** Local (non-persisted) chat state for the AI Mentor tab — same reasoning
 * as `useLeadAiAssistChat`: `/fn/ai-mentor` is a synchronous request/
 * response with no GET to resume a thread from, so this is genuinely local
 * UI state, not TanStack Query server state. */
export function useAiMentorChat() {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return; // guard empty + double-submit

      const userMessage: MentorMessage = { id: `local-${Date.now()}-u`, role: "user", content: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const history = messages
          .filter((m) => m.content.trim())
          .map((m) => ({ type: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

        const result = await aiMentorApi.send({
          message: trimmed,
          threadId,
          chatHistory: [...history, { type: "user", content: trimmed }],
        });

        if (result.threadId) setThreadId(result.threadId);
        const reply = result.reply?.trim();
        if (reply) {
          setMessages((prev) => [...prev, { id: `local-${Date.now()}-a`, role: "assistant", content: reply, ts: Date.now() }]);
        }
      } catch (err) {
        setError(err);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, threadId],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setThreadId(undefined);
    setError(null);
  }, []);

  return { messages, send, isSending, error, reset };
}

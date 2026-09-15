"use client";

import { useCallback, useState } from "react";

import { socialMediaAdvisorApi } from "@/services/api/socialMediaAdvisor";

export interface AdvisorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** Local (non-persisted) chat state for the AI Advisor tab — same
 * reasoning as `useAiMentorChat`/`useLeadAiAssistChat`: `/fn/
 * social-media-advisor` is a synchronous request/response with no GET to
 * resume a thread from. */
export function useAdvisorChat() {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return; // guard empty + double-submit

      const userMessage: AdvisorMessage = { id: `local-${Date.now()}-u`, role: "user", content: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const history = messages
          .filter((m) => m.content.trim())
          .map((m) => ({ type: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

        const result = await socialMediaAdvisorApi.send({
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

  return { messages, send, isSending, error };
}

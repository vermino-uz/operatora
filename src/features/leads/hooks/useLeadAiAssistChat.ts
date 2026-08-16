"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { leadAiAssistApi } from "@/services/api/leadAiAssist";

export interface LeadAssistMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** Local (non-persisted) chat state for the AI Assist "ask AI" panel —
 * exactly `useConversationAssistant`'s reasoning applied to leads instead of
 * conversations (genuinely local UI state, not TanStack Query server state:
 * `/fn/lead-ai-assist` is a synchronous request/response with no GET to
 * resume a thread from, and the conversation resets whenever the selected
 * lead changes). */
export function useLeadAiAssistChat(leadId: string) {
  const [messages, setMessages] = useState<LeadAssistMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const leadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (leadId !== leadIdRef.current) {
      leadIdRef.current = leadId;
      setMessages([]);
      setError(null);
    }
  }, [leadId]);

  const send = useCallback(
    async (text: string, presetType?: string) => {
      const trimmed = text.trim();
      if (!trimmed || !leadId || isSending) return; // guard empty + double-submit

      const userMessage: LeadAssistMessage = {
        id: `local-${Date.now()}-u`,
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const history = messages
          .filter((m) => m.content.trim())
          .map((m) => ({ type: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

        const result = await leadAiAssistApi.send({
          leadId,
          prompt: trimmed,
          presetType,
          chatHistory: [...history, { type: "user", content: trimmed }],
        });

        const reply = result.response?.talk_track?.trim();
        if (reply) {
          setMessages((prev) => [...prev, { id: `local-${Date.now()}-a`, role: "assistant", content: reply, ts: Date.now() }]);
        }
      } catch (err) {
        setError(err);
      } finally {
        setIsSending(false);
      }
    },
    [leadId, isSending, messages],
  );

  return { messages, send, isSending, error };
}

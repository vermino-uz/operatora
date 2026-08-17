"use client";

import { useCallback, useRef, useState } from "react";

import { streamChatMessage } from "@/services/api/chat";
import type { AdsCampaign } from "@/features/ads/types";

export interface AdsCopilotMessage {
  role: "user" | "assistant";
  content: string;
}

/** A page-context-aware AI chat, reusing the exact same real `/ai-chat/v2`
 * SSE endpoint the AI Chat feature (`/dashboard`) already streams from
 * (`services/api/chat.ts`'s `streamChatMessage`) — traced from the old
 * frontend's `components/ads/AdsCopilotPanel.tsx`, which turns out to call
 * the same endpoint too (`lib/aiChatStream.ts`'s `streamAdminAiChat`, a
 * thin wrapper around `/ai-chat/v2`), just without a persisted `threadId`
 * (ephemeral, page-local conversation — nothing saved server-side) and with
 * a campaign-summary line prefixed onto each question for context. No new
 * streaming plumbing needed — this hook is a thin, ephemeral-history
 * wrapper around the existing client. */
export function useAdsCopilot(workspaceId: string | null) {
  const [messages, setMessages] = useState<AdsCopilotMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const contextLine = useCallback((campaigns: AdsCampaign[], isSample: boolean) => {
    if (campaigns.length === 0) return "";
    const list = campaigns
      .slice(0, 5)
      .map((c) => `${c.name} (id: ${c.id}, status: ${c.status}, daily budget: ${c.dailyBudget} ${c.currency})`)
      .join("; ");
    return `[Ads page context${isSample ? " — SAMPLE data" : ""}: ${list}]\n\n`;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setStreamingText("");
  }, []);

  const ask = useCallback(
    async (question: string, campaigns: AdsCampaign[], isSample: boolean) => {
      const q = question.trim();
      if (!q || busy || !workspaceId) return;
      setBusy(true);
      setErrorMessage(null);
      setStreamingText("");
      const history = messages.slice(-8);
      setMessages((m) => [...m, { role: "user", content: q }]);

      const controller = new AbortController();
      abortRef.current = controller;
      let acc = "";

      await streamChatMessage(
        {
          query: `${contextLine(campaigns, isSample)}${q}`,
          conversationHistory: history,
          model: "auto",
          workspaceId,
        },
        {
          onEvent: (event) => {
            if (event.event === "token") {
              acc += event.data.text;
              setStreamingText(acc);
            } else if (event.event === "done") {
              acc = event.data.text || acc;
            } else if (event.event === "error") {
              setErrorMessage(event.data.message);
            }
          },
          onTransportError: (message) => setErrorMessage(message),
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;
      abortRef.current = null;
      setBusy(false);
      setStreamingText("");
      setMessages((m) => [...m, { role: "assistant", content: acc || "No response." }]);
    },
    [busy, messages, workspaceId, contextLine],
  );

  return { messages, streamingText, busy, errorMessage, ask, stop };
}

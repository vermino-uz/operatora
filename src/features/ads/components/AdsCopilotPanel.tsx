"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button, Spinner } from "@heroui/react";
import { Sparkles, Xmark } from "@gravity-ui/icons";
import ReactMarkdown from "react-markdown";

import { useAdsCopilot } from "@/features/ads/hooks/useAdsCopilot";
import type { AdsCampaign } from "@/features/ads/types";

const STARTER_CHIPS = [
  "Which campaign is spending the most?",
  "How is my budget performing this week?",
  "Suggest an audience improvement",
];

/** Page-context AI assistant panel — reference: old frontend's `components/
 * ads/AdsCopilotPanel.tsx`. Ephemeral conversation only (no thread
 * persistence) — see `useAdsCopilot`'s doc comment. */
export function AdsCopilotPanel({
  campaigns,
  isSample,
  workspaceId,
  open,
  onClose,
}: {
  campaigns: AdsCampaign[];
  isSample: boolean;
  workspaceId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { messages, streamingText, busy, errorMessage, ask, stop } = useAdsCopilot(workspaceId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, streamingText]);

  useEffect(() => {
    if (!open) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = (q: string) => {
    setInput("");
    void ask(q, campaigns, isSample);
  };

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-black/[0.08] dark:border-white/[0.12]">
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-black/[0.08] px-4 dark:border-white/[0.12]">
        <Sparkles className="h-4 w-4 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">Ads Copilot</p>
          <p className="truncate text-[11px] text-foreground/50">Ask about your campaigns</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <Xmark className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !streamingText ? (
          <div className="flex flex-col gap-1.5">
            <p className="mb-1 text-xs text-foreground/60">Try asking:</p>
            {STARTER_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => submit(c)}
                className="rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-black/[0.04] dark:border-white/[0.12] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="max-w-full rounded-2xl rounded-bl-md bg-black/[0.04] px-3 py-2 text-xs leading-relaxed text-foreground dark:bg-white/[0.06]">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ),
          )}
          {busy ? (
            <div className="max-w-full rounded-2xl rounded-bl-md bg-black/[0.04] px-3 py-2 text-xs leading-relaxed text-foreground dark:bg-white/[0.06]">
              {streamingText ? <ReactMarkdown>{streamingText}</ReactMarkdown> : <span className="text-foreground/40">Thinking…</span>}
            </div>
          ) : null}
          {errorMessage ? (
            <p role="alert" className="text-xs text-danger">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-black/[0.08] p-3 dark:border-white/[0.12]">
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && input.trim()) submit(input);
          }}
          disabled={busy}
          placeholder="Ask the copilot…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-transparent px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-foreground/30 disabled:opacity-60 dark:border-white/[0.12]"
        />
        <Button size="sm" variant="primary" isDisabled={busy || !input.trim()} onPress={() => submit(input)}>
          {busy ? <Spinner size="sm" aria-label="Sending" /> : "Ask"}
        </Button>
      </div>
    </aside>
  );
}

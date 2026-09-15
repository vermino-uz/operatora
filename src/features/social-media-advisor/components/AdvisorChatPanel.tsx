"use client";

import { useState } from "react";
import { Button, TextArea } from "@heroui/react";
import { Megaphone } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAdvisorChat } from "@/features/social-media-advisor/hooks/useAdvisorChat";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to use the AI Advisor.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't reach the AI Advisor. Please try again.";
}

/**
 * AI Advisor chat — real, working replacement for the old page's
 * non-functional "Analyze Conversations"/"Generate Content Ideas" buttons
 * (see `features/social-media-advisor/types.ts` doc comment for why those
 * are a confirmed backend gap). Free-text chat via `POST
 * /fn/social-media-advisor` — ask for post ideas, captions, hashtags, or a
 * posting schedule and add anything useful to Content Ideas manually.
 */
export function AdvisorChatPanel() {
  const { messages, send, isSending, error } = useAdvisorChat();
  const [draft, setDraft] = useState("");

  async function submit() {
    const text = draft;
    setDraft("");
    await send(text);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="min-h-[220px] rounded-xl border border-black/[0.08] bg-card p-4 dark:border-white/[0.12]">
        {messages.length === 0 ? (
          <EmptyState
            title="Ask the AI Advisor"
            description={'e.g. "Suggest 3 Instagram reel ideas for a language-learning app" or "Best hashtags for a B2B SaaS launch post".'}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "ml-auto bg-primary/10 text-foreground" : "bg-default/60 text-foreground"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isSending ? <p className="text-xs text-foreground/40">Advisor is typing…</p> : null}
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(error)}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSending) void submit();
        }}
        className="flex gap-2"
      >
        <TextArea
          aria-label="Message the AI Advisor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask for post ideas, captions, hashtags, or a posting schedule…"
          rows={2}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isSending) void submit();
            }
          }}
        />
        <Button type="submit" isDisabled={isSending || !draft.trim()}>
          <Megaphone className="size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

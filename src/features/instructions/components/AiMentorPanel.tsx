"use client";

import { useState } from "react";
import { Button, TextArea } from "@heroui/react";
import { GraduationCap } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAiMentorChat } from "@/features/instructions/hooks/useAiMentorChat";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to use the AI Mentor.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't reach the AI Mentor. Please try again.";
}

/**
 * AI Mentor — old page's third tab (`<AIMentor />`). A coaching chat backed
 * by the real `POST /fn/ai-mentor` handler (`AiChatService.chat()`,
 * `chatMode: 'mentor'`) — see `services/api/aiMentor.ts`. Plain
 * request/response chat, no persisted thread history across page reloads
 * (same limitation as Lead AI Assist's chat, which this mirrors).
 */
export function AiMentorPanel() {
  const { messages, send, isSending, error } = useAiMentorChat();
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
            title="Ask your AI Mentor"
            description="Get coaching on sales technique, objection handling, or how to phrase a tricky reply."
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
            {isSending ? <p className="text-xs text-foreground/40">Mentor is typing…</p> : null}
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
          aria-label="Message the AI Mentor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="How should I respond when a client says it's too expensive?"
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
          <GraduationCap className="size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

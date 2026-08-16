"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button, TextArea } from "@heroui/react";
import { PaperPlane, Sparkles } from "@gravity-ui/icons";
import { ErrorState } from "@/components/shared/ErrorState";
import { useConversationAssistant } from "@/features/conversations/hooks/useConversationAssistant";
import type { Conversation } from "@/features/conversations/types";

export interface ConversationAssistantPanelProps {
  conversation: Conversation;
  workspaceId: string | null;
}

/** "Ask about this conversation" — `POST /api/fn/conversation-ai-assistant`,
 * confirmed a plain JSON request/response (not SSE), see
 * `services/api/conversations.ts`'s contract comment for the trace. */
export function ConversationAssistantPanel({ conversation, workspaceId }: ConversationAssistantPanelProps) {
  const { messages, send, isSending, error } = useConversationAssistant(conversation, workspaceId);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const value = input;
    setInput("");
    void send(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-accent" aria-hidden="true" />
        Ask about this conversation
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-[var(--default)] p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted">
            Ask a question about {conversation.client_name || "this conversation"} — e.g. &ldquo;What went well?&rdquo;
            or &ldquo;What could the operator improve?&rdquo;
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "self-end bg-accent text-accent-foreground" : "self-start bg-background text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {isSending ? <p className="self-start text-xs text-muted">Thinking…</p> : null}
      </div>

      {error ? <ErrorState error={error} /> : null}

      <div className="flex items-end gap-2">
        <TextArea
          aria-label="Ask about this conversation"
          value={input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isSending) handleSend();
            }
          }}
          placeholder="Ask a question…"
          rows={2}
          className="flex-1"
        />
        <Button isIconOnly aria-label="Send" onPress={handleSend} isDisabled={!input.trim() || isSending}>
          <PaperPlane className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

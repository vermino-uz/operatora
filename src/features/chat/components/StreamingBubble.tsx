"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar } from "@heroui/react";
import { Sparkles } from "@gravity-ui/icons";

import { ChatCardRenderer } from "@/features/chat/components/ChatCards";
import type { StreamingState } from "@/features/chat/types";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-foreground/40"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export interface StreamingBubbleProps {
  streaming: StreamingState;
  threadId: string | null;
}

/** The live "in-flight" assistant turn — genuinely local UI state (not
 * TanStack Query cacheable server state, per the feature brief), so it's a
 * distinct component from `MessageBubble` rather than shoehorning a
 * pseudo-message into the query cache while it streams. */
export function StreamingBubble({ streaming, threadId }: StreamingBubbleProps) {
  if (streaming.phase === "idle") return null;

  return (
    <div className="flex gap-3 px-4 py-2">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <Avatar.Fallback>
          <Sparkles className="size-4" aria-hidden="true" />
        </Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {streaming.plan ? (
          <p className="mb-2 max-w-lg rounded-xl bg-black/[0.03] px-3 py-1.5 text-xs italic text-foreground/60 dark:bg-white/[0.04]">
            {streaming.plan}
          </p>
        ) : null}

        {streaming.notices.map((notice, i) => (
          <p key={i} className="mb-1 text-xs text-foreground/40">
            {notice}
          </p>
        ))}

        {streaming.steps.length > 0 ? (
          <ul className="mb-2 flex flex-col gap-1 text-xs text-foreground/50">
            {streaming.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    step.status === "done"
                      ? "bg-success"
                      : step.status === "error"
                        ? "bg-danger"
                        : "animate-pulse bg-warning"
                  }`}
                />
                <span>{step.tool}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {streaming.cards.map((card, index) => (
          <ChatCardRenderer
            key={index}
            card={card}
            messageId={streaming.aiMsgId ?? "streaming"}
            cardIndex={index}
            threadId={threadId}
          />
        ))}

        {streaming.text ? (
          <div className="chat-markdown max-w-lg text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{streaming.text}</ReactMarkdown>
          </div>
        ) : streaming.phase === "connecting" || streaming.phase === "streaming" ? (
          <TypingDots />
        ) : null}

        {streaming.phase === "error" && streaming.errorMessage ? (
          <p className="max-w-lg rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {streaming.errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

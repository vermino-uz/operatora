"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { StreamingBubble } from "@/features/chat/components/StreamingBubble";
import { ChatWelcome } from "@/features/chat/components/ChatWelcome";
import type { ChatMessage, StreamingState } from "@/features/chat/types";

export interface MessageListProps {
  messages: ChatMessage[];
  streaming: StreamingState;
  threadId: string | null;
  onSelectSuggestion: (text: string) => void;
  isSending: boolean;
}

export function MessageList({
  messages,
  streaming,
  threadId,
  onSelectSuggestion,
  isSending,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming.text, streaming.cards.length, streaming.steps.length]);

  if (messages.length === 0 && streaming.phase === "idle") {
    return <ChatWelcome onSelectSuggestion={onSelectSuggestion} disabled={isSending} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4">
      {/* Centered, width-capped column — matches the HeroUI Pro chat
          template's `max-w-[714px]` (a full-width thread reads too wide
          for chat, per feedback). */}
      <div className="mx-auto flex w-full max-w-[714px] flex-col px-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} threadId={threadId} />
        ))}
        <StreamingBubble streaming={streaming} threadId={threadId} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

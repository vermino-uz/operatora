"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, Button, Tooltip } from "@heroui/react";
import { Check, ChevronDown, Copy, Sparkles } from "@gravity-ui/icons";

import { ChatCardRenderer } from "@/features/chat/components/ChatCards";
import type { ChatMessage } from "@/features/chat/types";

function StepsTrace({ steps }: { steps: NonNullable<ChatMessage["steps"]> }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <div className="mb-2 max-w-lg rounded-xl border border-black/[0.06] bg-black/[0.02] text-xs dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-foreground/60"
      >
        <span>{steps.length} step{steps.length === 1 ? "" : "s"}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul className="flex flex-col gap-1 px-3 pb-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-foreground/70">
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  step.status === "done" ? "bg-success" : step.status === "error" ? "bg-danger" : "bg-warning"
                }`}
              />
              <span className="truncate">{step.tool}</span>
              {step.detail ? <span className="truncate text-foreground/40">— {step.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip delay={200}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Copy message"
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard access can fail (permissions/insecure context) — not
            // worth a toast for a low-stakes convenience action.
          }
        }}
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </Button>
      <Tooltip.Content placement="top">{copied ? "Copied" : "Copy"}</Tooltip.Content>
    </Tooltip>
  );
}

export interface MessageBubbleProps {
  message: ChatMessage;
  threadId: string | null;
}

export function MessageBubble({ message, threadId }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-xl rounded-2xl bg-accent px-4 py-2 text-sm text-accent-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-2">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <Avatar.Fallback>
          <Sparkles className="size-4" aria-hidden="true" />
        </Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {message.plan ? (
          <p className="mb-2 max-w-lg rounded-xl bg-black/[0.03] px-3 py-1.5 text-xs italic text-foreground/60 dark:bg-white/[0.04]">
            {message.plan}
          </p>
        ) : null}

        {message.steps?.length ? <StepsTrace steps={message.steps} /> : null}

        {message.error ? (
          <p className="max-w-lg rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {message.error.message}
          </p>
        ) : message.content ? (
          <div className="chat-markdown max-w-lg text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : null}

        {message.stopped ? <p className="mt-1 text-xs text-foreground/40">Stopped by user.</p> : null}

        {message.cards?.map((card, index) => (
          <ChatCardRenderer key={index} card={card} messageId={message.id} cardIndex={index} threadId={threadId} />
        ))}

        {message.content ? (
          <div className="mt-1">
            <CopyButton text={message.content} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

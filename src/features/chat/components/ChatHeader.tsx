"use client";

import { Chip } from "@heroui/react";
import { ChevronLeft, Comment as MessageSquare } from "@gravity-ui/icons";

export interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  modelLabel?: string;
  /** Mobile: back to thread list (does not clear the active thread). */
  onBack?: () => void;
  /** Mobile: open thread list from the header. */
  onOpenThreads?: () => void;
}

/** Thin per-page header bar inside the dashboard content area — adapted from
 * the HeroUI Pro template's `chat-navbar.tsx` concept, but scoped as a
 * simple header (not a competing top-level navbar; `AppShell`/`AppSidebar`
 * already own the app-wide chrome). */
export function ChatHeader({ title, subtitle, modelLabel, onBack, onOpenThreads }: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
      <div className="flex min-w-0 items-center gap-2">
        {onBack ? (
          <button
            type="button"
            aria-label="Back to chat list"
            onClick={onBack}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-foreground/60 hover:bg-[var(--default)] hover:text-foreground md:hidden"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-foreground/50">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onOpenThreads ? (
          <button
            type="button"
            aria-label="Chat history"
            onClick={onOpenThreads}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground/60 hover:bg-[var(--default)] hover:text-foreground md:hidden"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {modelLabel ? (
          <Chip size="sm" variant="soft">
            <Chip.Label>{modelLabel}</Chip.Label>
          </Chip>
        ) : null}
      </div>
    </header>
  );
}

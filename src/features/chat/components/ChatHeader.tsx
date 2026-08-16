"use client";

import { Chip } from "@heroui/react";

export interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  modelLabel?: string;
}

/** Thin per-page header bar inside the dashboard content area — adapted from
 * the HeroUI Pro template's `chat-navbar.tsx` concept, but scoped as a
 * simple header (not a competing top-level navbar; `AppShell`/`AppSidebar`
 * already own the app-wide chrome). */
export function ChatHeader({ title, subtitle, modelLabel }: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-foreground/50">{subtitle}</p> : null}
      </div>
      {modelLabel ? (
        <Chip size="sm" variant="soft">
          <Chip.Label>{modelLabel}</Chip.Label>
        </Chip>
      ) : null}
    </header>
  );
}

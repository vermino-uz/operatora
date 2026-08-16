"use client";

import { Sparkles } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";

/** Ported from the old frontend's Dashboard.tsx empty-state copy
 * (locales/en/dashboard.json `suggestions.chip1..4`) — kept as plain
 * English strings since this project has no i18n layer (see ARCHITECTURE.md;
 * this app doesn't carry over the old app's react-i18next setup). */
const SUGGESTIONS = [
  "How many new leads came in this week?",
  "Summarize today's conversations",
  "Which operator has the best conversion?",
  "What are the top reasons leads went cold?",
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export interface ChatWelcomeProps {
  onSelectSuggestion: (text: string) => void;
  disabled?: boolean;
}

/** Claude-style centered greeting + suggestion chips shown before the first
 * message in a new/empty chat — mirrors the old frontend's Dashboard.tsx
 * empty state (greeting, subtitle, "Try asking" chips), rebuilt on this
 * project's own components/theme rather than copied verbatim. */
export function ChatWelcome({ onSelectSuggestion, disabled }: ChatWelcomeProps) {
  const user = useSessionStore((s) => s.user);
  const displayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "there";

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 sm:px-10">
      <div className="flex items-center gap-3">
        <Sparkles className="size-7 text-accent" aria-hidden="true" />
        <h1 className="text-[28px] font-normal tracking-tight text-foreground sm:text-[32px]">
          {getGreeting()}, <span className="font-semibold">{displayName}</span>
        </h1>
      </div>
      <p className="mt-3 text-sm text-foreground/60">
        Ask anything about performance, conversations, or leads.
      </p>

      <div className="mt-7 w-full max-w-[640px]">
        <p className="mb-3 text-center text-xs text-foreground/40">Try asking</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onSelectSuggestion(text)}
              disabled={disabled}
              className="truncate rounded-xl border border-black/[0.08] bg-background px-3.5 py-2.5 text-left text-[13px] text-foreground transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

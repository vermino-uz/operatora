"use client";

import type { CannedResponseRow } from "@/features/canned-responses/types";
import { formatShortcut } from "@/features/canned-responses/types";
import { matchCannedPrefix } from "@/features/messages/lib/cannedResponses";

export interface CannedResponsesMenuProps {
  draft: string;
  responses: CannedResponseRow[];
  onPick: (body: string) => void;
  className?: string;
}

/** Autocomplete list when the composer draft starts with `/…`. */
export function CannedResponsesMenu({ draft, responses, onPick, className = "" }: CannedResponsesMenuProps) {
  const matches = draft.startsWith("/") ? matchCannedPrefix(draft, responses) : responses;
  if (matches.length === 0) return null;

  return (
    <ul
      className={`max-h-48 overflow-y-auto rounded-lg border border-black/10 bg-background shadow-lg dark:border-white/10 ${className}`}
    >
      {matches.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--default)]"
            onClick={() => onPick(r.body)}
          >
            <span className="text-xs font-semibold text-accent">{formatShortcut(r.shortcut)}</span>
            <p className="mt-0.5 line-clamp-1 text-xs text-foreground/60">{r.body}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

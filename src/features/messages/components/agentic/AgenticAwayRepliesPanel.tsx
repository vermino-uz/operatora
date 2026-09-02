"use client";

import { Comment, ArrowRotateRight } from "@gravity-ui/icons";

import { initialsFor } from "@/features/messages/types";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import { useAwayReplies } from "@/features/messages/hooks/useAgentic";
import type { AgenticChannel } from "@/services/api/agentic";
import { AGENTIC_AVATAR_PALETTE } from "@/features/messages/components/agentic/types";

export interface AgenticAwayRepliesPanelProps {
  active: boolean;
  channel?: AgenticChannel;
  onOpenChat?: (chatId: string) => void;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function AgenticAwayRepliesPanel({
  active,
  channel = "telegram",
  onOpenChat,
}: AgenticAwayRepliesPanelProps) {
  const { data: chats = [], isLoading } = useAwayReplies(active, channel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-foreground/40">
        <ArrowRotateRight className="size-5 animate-spin" />
      </div>
    );
  }

  if (!chats.length) {
    return <div className="py-10 text-center text-[13px] text-foreground/50">No away-replies in the last 14 days.</div>;
  }

  return (
    <div className="space-y-1.5">
      {chats.map((c) => {
        const label = c.name || c.phone || c.chat_id.slice(0, 8);
        return (
          <button
            key={c.chat_id}
            type="button"
            onClick={() => onOpenChat?.(c.chat_id)}
            className="flex w-full items-center gap-3 rounded-lg border border-black/10 bg-[var(--default)] px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: pickAvatarColor(c.chat_id, AGENTIC_AVATAR_PALETTE) }}
            >
              {initialsFor(label)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
                <span className="shrink-0 text-[11px] text-foreground/40">
                  {formatRelative(c.last_away_reply_at)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-foreground/60">{c.preview}</p>
            </div>
            <Comment className="size-3.5 shrink-0 text-foreground/40" />
          </button>
        );
      })}
    </div>
  );
}

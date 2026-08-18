"use client";

import { Avatar } from "@heroui/react";
import { initialsFor } from "@/features/messages/types";

export interface ConversationListItemProps {
  id: string;
  name: string;
  preview?: string | null;
  timestamp?: string | null;
  unreadCount?: number;
  avatarUrl?: string | null;
  active: boolean;
  onSelect: (id: string) => void;
}

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Adapted from the HeroUI Pro email template's `email-list-item.tsx` list
 * anatomy (avatar + name/timestamp row + preview line + unread indicator)
 * — rebuilt on plain `@heroui/react` + Tailwind (no `@heroui-pro/react`
 * runtime available here, see `ChatThreadList.tsx`'s precedent), and
 * swapping "subject + preview" for a single last-message preview line
 * since this is a chat inbox, not an email reader. */
export function ConversationListItem({ id, name, preview, timestamp, unreadCount, avatarUrl, active, onSelect }: ConversationListItemProps) {
  const hasUnread = (unreadCount ?? 0) > 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors ${
          active ? "bg-[var(--default)]" : "hover:bg-[var(--default)]/60"
        }`}
      >
        <Avatar className="size-9 shrink-0">
          {avatarUrl ? <Avatar.Image alt={name} src={avatarUrl} /> : null}
          <Avatar.Fallback>{initialsFor(name)}</Avatar.Fallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm leading-tight ${hasUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
              {name}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`whitespace-nowrap text-xs leading-tight ${hasUnread ? "font-medium text-foreground" : "text-foreground/40"}`}>
                {formatTimestamp(timestamp)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-xs leading-tight ${hasUnread ? "text-foreground/80" : "text-foreground/40"}`}>
              {preview || "No messages yet"}
            </span>
            {hasUnread ? (
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
                {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

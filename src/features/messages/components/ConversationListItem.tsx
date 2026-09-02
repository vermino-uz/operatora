"use client";

import { useEffect, useState } from "react";

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
  attention?: boolean;
  agentBadge?: string | null;
  agentBadgeIsHuman?: boolean;
  assignee?: string | null;
  unassigned?: boolean;
  closed?: boolean;
}

export function conversationListItemClassName(active: boolean, attention?: boolean): string {
  return `relative flex w-full items-center gap-3 border-b border-black/[0.06] px-3 py-2 text-left transition-colors dark:border-white/[0.06] ${
    active ? "bg-accent/10 hover:bg-accent/10" : "bg-transparent hover:bg-[var(--default)]/70"
  } ${attention ? "border-l-2 border-l-[#F59E0B] pl-[10px]" : ""}`;
}

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (date.getTime() > weekAgo) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ListAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);

  const initials = initialsFor(name);

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- proxied chat avatar stream
      <img
        src={avatarUrl}
        alt=""
        loading="lazy"
        className="size-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className="text-[15px] font-semibold text-white">{initials}</span>;
}

/** Row body shared by the standalone list item and Telegram context-menu rows. */
export function ConversationListItemContent({
  name,
  preview,
  timestamp,
  unreadCount,
  avatarUrl,
  attention,
  agentBadge,
  agentBadgeIsHuman,
  assignee,
  unassigned,
  closed,
}: Omit<ConversationListItemProps, "id" | "active" | "onSelect">) {
  const hasUnread = (unreadCount ?? 0) > 0;
  const timeLabel = formatTimestamp(timestamp);

  return (
    <>
      <div
        className="flex size-[54px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-white"
        aria-hidden="true"
      >
        <ListAvatar name={name} avatarUrl={avatarUrl} />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`min-w-0 truncate text-[15px] leading-tight ${
              hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
            }`}
          >
            {name}
          </span>
          {timeLabel ? (
            <span
              className={`shrink-0 tabular-nums text-xs leading-tight ${
                hasUnread ? "font-medium text-[#3A9BDC]" : "text-foreground/45"
              }`}
            >
              {timeLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={`min-w-0 truncate text-[13px] leading-snug ${
              hasUnread ? "text-foreground/90" : "text-foreground/45"
            }`}
          >
            {preview || "No messages yet"}
          </span>
          {hasUnread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#5AC8FA] px-1.5 text-[11px] font-semibold text-white">
              {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
        {attention || agentBadge || assignee || closed ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {attention ? (
              <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">Needs you</span>
            ) : null}
            {agentBadge ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: agentBadgeIsHuman ? "#F59E0B" : "#7C3AED" }}
              >
                {agentBadge}
              </span>
            ) : null}
            {assignee ? (
              <span
                className={`truncate text-[10px] font-medium ${unassigned ? "text-[#EA580C]" : "text-foreground/45"}`}
              >
                {assignee}
              </span>
            ) : null}
            {closed ? (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Closed</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Telegram Web–style flat chat row: 54px avatar, title/time row, preview + unread badge. */
export function ConversationListItem({
  id,
  name,
  preview,
  timestamp,
  unreadCount,
  avatarUrl,
  active,
  onSelect,
  attention,
  agentBadge,
  agentBadgeIsHuman,
  assignee,
  unassigned,
  closed,
}: ConversationListItemProps) {
  return (
    <li>
      <button type="button" onClick={() => onSelect(id)} className={conversationListItemClassName(active, attention)}>
        <ConversationListItemContent
          name={name}
          preview={preview}
          timestamp={timestamp}
          unreadCount={unreadCount}
          avatarUrl={avatarUrl}
          attention={attention}
          agentBadge={agentBadge}
          agentBadgeIsHuman={agentBadgeIsHuman}
          assignee={assignee}
          unassigned={unassigned}
          closed={closed}
        />
      </button>
    </li>
  );
}

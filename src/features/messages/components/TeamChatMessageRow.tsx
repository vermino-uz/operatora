"use client";

import { initialsFor, profileName, type TeamChatMessage, type TeamChatProfile } from "@/features/messages/types";

const AVATAR_COLORS = [
  "bg-[#7c3aed]",
  "bg-[#2563eb]",
  "bg-[#dc2626]",
  "bg-[#d97706]",
  "bg-[#059669]",
  "bg-[#db2777]",
  "bg-[#0891b2]",
];

function avatarColorFor(senderId: string): string {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = (hash * 31 + senderId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Slack-style team chat row — plain text, left-aligned avatar column. Not
 * the customer-inbox bubble UI (`MessageBubbleRow`). */
export function TeamChatMessageRow({
  message,
  profile,
  isOwn,
  isContinuation,
}: {
  message: TeamChatMessage;
  profile?: TeamChatProfile;
  isOwn: boolean;
  isContinuation: boolean;
}) {
  const senderName = profileName(profile, message.sender_id);
  const initial = initialsFor(senderName);
  const time = new Date(message.created_at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`group -mx-2 flex items-start gap-3 rounded-md px-2 transition-colors ${
        isOwn ? "bg-accent/[0.04] hover:bg-accent/[0.07]" : "hover:bg-[var(--default)]"
      } ${isContinuation ? "py-0.5" : "pb-1 pt-2"}`}
    >
      {isContinuation ? (
        <div className="flex w-9 shrink-0 items-start justify-center pt-0.5">
          <span className="text-[10px] text-foreground/35 opacity-0 group-hover:opacity-100">{time}</span>
        </div>
      ) : (
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold text-white ${avatarColorFor(message.sender_id)}`}
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {!isContinuation ? (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-foreground">{senderName}</span>
            <span className="text-[11px] text-foreground/40">{time}</span>
          </div>
        ) : null}
        {message.attachment_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- team chat attachment URL
          <img
            src={message.attachment_url}
            alt=""
            className="mb-1 max-h-[220px] max-w-[280px] rounded-lg border border-black/[0.08] object-cover dark:border-white/[0.12]"
          />
        ) : null}
        {message.content ? (
          <div className="whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground">
            {message.content}
          </div>
        ) : !message.attachment_url ? (
          <div className="text-[13px] italic text-foreground/40">(empty message)</div>
        ) : null}
      </div>
    </div>
  );
}

export function isTeamChatContinuation(
  prev: TeamChatMessage | null,
  current: TeamChatMessage,
): boolean {
  if (!prev) return false;
  if (prev.sender_id !== current.sender_id) return false;
  return (
    new Date(current.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
  );
}

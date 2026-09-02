"use client";

import { useMemo, useState } from "react";

import { useSessionStore } from "@/state/session-store";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ChannelRail } from "@/features/messages/components/ChannelRail";
import { TelegramPanel } from "@/features/messages/components/TelegramPanel";
import { InstagramPanel } from "@/features/messages/components/InstagramPanel";
import { SmsPanel } from "@/features/messages/components/SmsPanel";
import { TeamChatPanel } from "@/features/messages/components/TeamChatPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ChannelKey } from "@/features/messages/types";

/**
 * Messages (`/messages`) — a live multi-channel chat inbox: Telegram +
 * Instagram + SMS customer channels, plus an internal Team Chat. Genuinely
 * distinct from `/conversations` (`src/features/conversations/`, a
 * read-only AI-call transcript review table) — see PROGRESS.md's dated
 * "Messages — …" entries for the full backend trace, scope, and what's
 * deliberately deferred (media/stickers, message edit/delete/forward/
 * reactions, the "agentic" AI auto-reply subsystem, Telegram's linked-
 * account/userbot mode, Instagram groups/automations, WhatsApp beyond a
 * "coming soon" placeholder — matching the old frontend's own state for
 * that channel).
 *
 * Old frontend reference (`pages/Messages.tsx`) had a top-level Customer
 * Inbox / Team Chat tab switcher with a channel rail inside Customer
 * Inbox; this page reproduces that structure with this app's own visual
 * language (adapted from the HeroUI Pro email template's three-pane
 * shell — see PROGRESS.md) rather than porting the old app's styling.
 */
export default function MessagesPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [topTab, setTopTab] = useState<"inbox" | "team">("inbox");
  const [channel, setChannel] = useState<ChannelKey>("telegram");
  const [telegramUnread, setTelegramUnread] = useState(0);
  const [instagramUnread, setInstagramUnread] = useState(0);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);

  const canViewTelegram = permissionsQuery.data?.matrix?.telegram?.view ?? true;
  const canViewInstagram = permissionsQuery.data?.matrix?.instagram?.view ?? true;

  const channels = useMemo<ChannelKey[]>(() => {
    const list: ChannelKey[] = [];
    if (canViewTelegram) list.push("telegram");
    if (canViewInstagram) list.push("instagram");
    list.push("sms", "whatsapp");
    return list;
  }, [canViewTelegram, canViewInstagram]);

  if (permissionsQuery.isLoading) {
    return <LoadingState label="Loading Messages…" className="flex-1" />;
  }
  if (permissionsQuery.isError) {
    return <ErrorState error={permissionsQuery.error} onRetry={() => permissionsQuery.refetch()} className="flex-1" />;
  }

  return (
    <div className="-m-3 flex h-[calc(100%+1.5rem)] min-h-0 flex-col md:-m-6 md:h-[calc(100%+3rem)]">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-black/[0.06] px-3 py-2 dark:border-white/10 md:px-4">
        <TopTabButton active={topTab === "inbox"} onClick={() => { setTopTab("inbox"); setMobileChatOpen(false); }} label="Customer Inbox" badge={telegramUnread + instagramUnread} />
        <TopTabButton active={topTab === "team"} onClick={() => { setTopTab("team"); setMobileChatOpen(false); }} label="Team Chat" />
      </div>

      <div className="flex min-h-0 flex-1">
        {topTab === "inbox" ? (
          <>
            <ChannelRail
              active={channel}
              onSelect={(c) => { setChannel(c); setMobileChatOpen(false); }}
              channels={channels}
              unreadByChannel={{ telegram: telegramUnread, instagram: instagramUnread }}
              className={mobileChatOpen ? "hidden md:flex" : undefined}
            />
            {channel === "telegram" ? (
              canViewTelegram ? (
                <TelegramPanel onUnreadChange={setTelegramUnread} onChatOpenChange={setMobileChatOpen} />
              ) : (
                <LockedChannel name="Telegram" />
              )
            ) : channel === "instagram" ? (
              canViewInstagram ? (
                <InstagramPanel onUnreadChange={setInstagramUnread} onChatOpenChange={setMobileChatOpen} />
              ) : (
                <LockedChannel name="Instagram" />
              )
            ) : channel === "sms" ? (
              <SmsPanel onChatOpenChange={setMobileChatOpen} />
            ) : (
              <ComingSoonChannel name="WhatsApp" />
            )}
          </>
        ) : (
          <TeamChatPanel onChatOpenChange={setMobileChatOpen} />
        )}
      </div>
    </div>
  );
}

function TopTabButton({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-foreground/60 hover:bg-[var(--default)]"
      }`}
    >
      {label}
      {badge ? (
        <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${active ? "bg-white/20" : "bg-danger text-white"}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function LockedChannel({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState title={`No access to ${name}`} description="Ask a workspace admin to grant you access in Settings → Roles & Permissions." />
    </div>
  );
}

function ComingSoonChannel({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState title={`${name} — coming soon`} description="This channel isn't available yet, matching the current state of the old app too." />
    </div>
  );
}

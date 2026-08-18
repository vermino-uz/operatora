"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@heroui/react";
import { PaperPlane, Comment, CommentDot, Comments } from "@gravity-ui/icons";

import type { ChannelKey } from "@/features/messages/types";

/** `@gravity-ui/icons` (this app's icon set) has no brand marks for
 * Telegram/Instagram/WhatsApp — using generic, semantically-close icons
 * (send/comment/dot) plus the channel's own accent color to distinguish
 * them, rather than faking brand logos. Consistent with this feature's
 * "clean rebuild, not a visual port of the old frontend" brief. */
const CHANNEL_ICON: Record<ChannelKey, ReactNode> = {
  telegram: <PaperPlane className="size-5" aria-hidden="true" />,
  instagram: <Comment className="size-5" aria-hidden="true" />,
  sms: <CommentDot className="size-5" aria-hidden="true" />,
  whatsapp: <Comment className="size-5" aria-hidden="true" />,
  team: <Comments className="size-5" aria-hidden="true" />,
};

const CHANNEL_LABEL: Record<ChannelKey, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  sms: "SMS",
  whatsapp: "WhatsApp",
  team: "Team Chat",
};

const CHANNEL_ACCENT: Record<ChannelKey, string> = {
  telegram: "#26A5E4",
  instagram: "#E4405F",
  sms: "#0EA5E9",
  whatsapp: "#25D366",
  team: "#7C3AED",
};

export interface ChannelRailProps {
  active: ChannelKey;
  onSelect: (channel: ChannelKey) => void;
  unreadByChannel?: Partial<Record<ChannelKey, number>>;
  channels: ChannelKey[];
}

/** Vertical channel rail — adapted from the old frontend's own channel-
 * switcher concept (`MessagesCustomerInbox.tsx`'s `ChannelButton`) but
 * rebuilt with this app's own visual language (Tailwind + `@heroui/react`
 * `Tooltip`), not a literal port of its inline styles. */
export function ChannelRail({ active, onSelect, unreadByChannel, channels }: ChannelRailProps) {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-black/[0.06] bg-background py-4 dark:border-white/10">
      {channels.map((channel) => {
        const isActive = channel === active;
        const unread = unreadByChannel?.[channel] ?? 0;
        return (
          <Tooltip key={channel} delay={200}>
            <button
              type="button"
              onClick={() => onSelect(channel)}
              aria-label={CHANNEL_LABEL[channel]}
              aria-current={isActive}
              className="relative flex size-11 items-center justify-center rounded-xl transition-colors"
              style={{
                backgroundColor: isActive ? CHANNEL_ACCENT[channel] : "transparent",
                color: isActive ? "#ffffff" : "var(--muted-foreground, #737a80)",
              }}
            >
              {CHANNEL_ICON[channel]}
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-danger px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </button>
            <Tooltip.Content placement="right">{CHANNEL_LABEL[channel]}</Tooltip.Content>
          </Tooltip>
        );
      })}
    </nav>
  );
}

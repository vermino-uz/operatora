"use client";

import { Globe, Handset, Smartphone } from "@gravity-ui/icons";
import type { Conversation } from "@/features/conversations/types";
import {
  formatConversationTime,
  formatPhoneForDisplay,
  getConversationClientDisplayName,
  getInitial,
  getStatusDotClass,
} from "@/features/conversations/utils/conversationDisplay";

function getChannelIcon(source?: string | null) {
  if (!source) return Handset;
  const s = source.toLowerCase();
  if (s.includes("web")) return Globe;
  if (s.includes("mobile") || s.includes("telegram")) return Smartphone;
  return Handset;
}

export interface ConversationListItemProps {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, active, onClick }: ConversationListItemProps) {
  const displayName =
    getConversationClientDisplayName(conversation) ||
    formatPhoneForDisplay(conversation.client_phone) ||
    "Unknown";
  const ChannelIcon = getChannelIcon(conversation.source);
  const isProcessing = (conversation.status || "").toLowerCase().includes("processing");

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`conversation-list-item-${conversation.id}`}
      className={`relative w-full border-b border-divider/60 text-left transition-colors ${
        active ? "bg-accent/10" : "bg-background hover:bg-[var(--default)]"
      }`}
    >
      {active ? <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-accent" /> : null}
      <div className="flex gap-3 px-4 py-3">
        <div className="relative shrink-0">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-[16px] font-semibold text-accent-foreground">
            {getInitial(displayName)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${getStatusDotClass(
              conversation.status,
            )}`}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-foreground">{displayName}</p>
            <span className="shrink-0 text-[12px] text-muted">{formatConversationTime(conversation)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] text-foreground/60">
              Operator: {conversation.operator_name || "—"}
            </p>
            <span className="flex shrink-0 items-center gap-1 text-[12px] text-foreground/60">
              <span aria-hidden="true">⏱</span>
              {conversation.duration || "—"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <p
              className={`line-clamp-1 flex-1 text-[12px] ${
                isProcessing ? "text-warning" : "text-muted"
              }`}
            >
              {isProcessing ? "Processing…" : conversation.summary || "No summary yet"}
            </p>
            <ChannelIcon className="mt-0.5 size-3.5 shrink-0 text-foreground/50" aria-hidden="true" />
          </div>
        </div>
      </div>
    </button>
  );
}

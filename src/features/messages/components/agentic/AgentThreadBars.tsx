"use client";

import { Button } from "@heroui/react";
import { Sparkles } from "@gravity-ui/icons";

import type { AgenticResponseMode, AgenticSettings } from "@/services/api/agentic";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

export interface AgentThreadChat {
  agentic_paused?: boolean | null;
}

export interface AgentThreadBarsProps {
  chat: AgentThreadChat;
  agenticEnabled: boolean;
  agenticSettings: AgenticSettings | undefined;
  isTargeted: boolean;
  hasPendingDraft: boolean;
  busy?: boolean;
  onTakeOver: () => void;
  onResume: () => void;
}

export function AgentThreadBars({
  chat,
  agenticEnabled,
  agenticSettings,
  isTargeted,
  hasPendingDraft,
  busy,
  onTakeOver,
  onResume,
}: AgentThreadBarsProps) {
  if (!agenticEnabled) return null;

  if (chat.agentic_paused) {
    return (
      <div className="flex items-center gap-3 border-t px-5 py-3" style={{ backgroundColor: "#FFFBEB" }}>
        <span className="size-2 shrink-0 rounded-full bg-[#F59E0B]" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#92400E]">You took over — agent is paused</span>
        <Button size="sm" onPress={onResume} isDisabled={busy} className="shrink-0 text-white" style={{ backgroundColor: AGENT_VIOLET }}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          Resume agent
        </Button>
      </div>
    );
  }

  if (!isTargeted) return null;

  const mode: AgenticResponseMode | undefined = agenticSettings?.response_mode;

  if (mode === "auto") {
    return (
      <div className="flex items-center gap-3 border-t px-5 py-3" style={{ backgroundColor: "#7C3AED08" }}>
        <span className="size-2 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: AGENT_VIOLET }} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#5B21B6]">
          <Sparkles className="mr-1 inline size-3.5" aria-hidden="true" />
          Agent is auto-replying
        </span>
        <Button size="sm" onPress={onTakeOver} isDisabled={busy} className="shrink-0 text-white" style={{ backgroundColor: AGENT_VIOLET }}>
          Take over
        </Button>
      </div>
    );
  }

  if (mode === "manual" && !hasPendingDraft) {
    return (
      <div className="flex items-center justify-between gap-3 border-t px-5 py-2.5" style={{ backgroundColor: "#7C3AED08" }}>
        <span className="min-w-0 truncate text-[12px] font-medium text-[#5B21B6]">
          <Sparkles className="mr-1 inline size-3.5" aria-hidden="true" />
          Agent may draft a reply
        </span>
        <Button size="sm" variant="secondary" onPress={onTakeOver} isDisabled={busy}>Take over</Button>
      </div>
    );
  }

  return null;
}

export function ReplyBlockedBanner({ botUsername }: { botUsername?: string | null }) {
  const handle = botUsername ? `@${botUsername.replace(/^@/, "")}` : "your bot";
  return (
    <div className="flex items-start gap-2 border-b border-[#FEF3C7] bg-[#FFFBEB] px-4 py-2.5 text-[12px] text-[#92400E]">
      <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <p>
        Agent replies are blocked — grant <strong>Reply to messages</strong> to {handle} in Telegram Business settings.
      </p>
    </div>
  );
}

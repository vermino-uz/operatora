"use client";

import { Button } from "@heroui/react";
import { Pencil, Sparkles, Xmark } from "@gravity-ui/icons";

import { useTakeoverFollowup } from "@/features/messages/hooks/useAgentic";
import type { AgenticChannel } from "@/services/api/agentic";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

export interface TakeoverFollowupBarProps {
  chatId: string;
  channel?: AgenticChannel;
  busy?: boolean;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  onDismiss: () => void;
}

export function TakeoverFollowupBar({ chatId, channel = "telegram", busy, onSend, onEdit, onDismiss }: TakeoverFollowupBarProps) {
  const { data, isLoading, isError } = useTakeoverFollowup(chatId, true, channel);
  if (isError) return null;
  if (isLoading) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 rounded-[10px] border border-[#7C3AED2a] bg-[#7C3AED08] px-3 py-2.5">
        <Sparkles className="size-3.5 animate-pulse" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        <span className="text-[12px] text-foreground/45">Preparing suggested follow-up…</span>
      </div>
    );
  }
  const text = (data?.text || "").trim();
  if (!text) return null;
  return (
    <div className="mx-4 mt-3 rounded-[10px] border border-[#7C3AED2a] bg-[#7C3AED08] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        <span className="flex-1 text-[11px] font-bold uppercase" style={{ color: AGENT_VIOLET }}>Suggested first reply</span>
        <button type="button" onClick={onDismiss} className="rounded-md p-1 text-foreground/40 hover:bg-[var(--default)]" aria-label="Dismiss"><Xmark className="size-3.5" /></button>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] text-foreground">{text}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onPress={() => onSend(text)} isDisabled={busy} className="text-white" style={{ backgroundColor: AGENT_VIOLET }}>Send</Button>
        <Button size="sm" variant="secondary" onPress={() => onEdit(text)}><Pencil className="size-3.5" /> Edit</Button>
      </div>
    </div>
  );
}

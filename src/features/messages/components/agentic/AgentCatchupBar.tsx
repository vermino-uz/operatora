"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Check, ChevronRight, CircleExclamation, Sparkles } from "@gravity-ui/icons";

import { useCatchup, useCatchupSummary, useMarkCatchupSeen } from "@/features/messages/hooks/useAgentic";
import type { AgenticChannel, CatchupItem } from "@/services/api/agentic";
import { initialsFor } from "@/features/messages/types";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

const CATCHUP_PALETTE = ["#7C3AED", "#26A5E4", "#059669", "#D97706", "#DC2626"];

function formatRelativeDay(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface AgentCatchupBarProps {
  channel?: AgenticChannel;
  onOpenChat: (chatId: string) => void;
}

export function AgentCatchupBar({ channel = "telegram", onOpenChat }: AgentCatchupBarProps) {
  const [open, setOpen] = useState(false);
  const { data } = useCatchup(true, channel);
  const markSeen = useMarkCatchupSeen(channel);
  const summary = useCatchupSummary(channel);

  if (!data || data.items.length === 0) return null;
  const { totals } = data;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-opacity hover:opacity-85"
        style={{ backgroundColor: "rgba(124,58,237,0.08)" }}
      >
        <Sparkles className="size-4 shrink-0" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold" style={{ color: AGENT_VIOLET }}>While you were away</span>
          <span className="block truncate text-[11.5px] text-foreground/60">{totals.chats} chats · {totals.agent_messages} agent replies</span>
        </span>
        {totals.attention > 0 ? (
          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] px-1 text-[10.5px] font-bold text-[#92400E]">{totals.attention}</span>
        ) : null}
        <ChevronRight className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
      </button>

      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container size="md">
          <Modal.Dialog className="flex max-h-[85vh] flex-col">
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Sparkles className="size-4" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
                While you were away
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="min-h-0 flex-1 overflow-y-auto">
              <div className="mb-3">
                {summary.data?.summary ? (
                  <div className="whitespace-pre-line rounded-[10px] px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ backgroundColor: "rgba(124,58,237,0.06)" }}>{summary.data.summary}</div>
                ) : (
                  <Button variant="secondary" fullWidth onPress={() => summary.mutate()} isDisabled={summary.isPending}>
                    {summary.isPending ? "Generating overview…" : "Generate AI overview"}
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {data.items.map((item) => (
                  <CatchupRow key={item.chat_id} item={item} onClick={() => { setOpen(false); onOpenChat(item.chat_id); }} />
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                fullWidth
                className="text-white"
                style={{ backgroundColor: AGENT_VIOLET }}
                isDisabled={markSeen.isPending}
                onPress={() => markSeen.mutate(undefined, { onSuccess: () => setOpen(false) })}
              >
                <Check className="size-4" aria-hidden="true" />
                Mark as seen
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

function CatchupRow({ item, onClick }: { item: CatchupItem; onClick: () => void }) {
  const color = pickAvatarColor(item.chat_id, CATCHUP_PALETTE);
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left hover:bg-[var(--default)]">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ backgroundColor: color }}>{initialsFor(item.title)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-foreground">{item.title}</span>
          <span className="ml-auto shrink-0 text-[11px] text-foreground/40">{formatRelativeDay(item.last_activity_at)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-foreground/60">{item.headline || item.last_preview || "—"}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ backgroundColor: "rgba(124,58,237,0.1)", color: AGENT_VIOLET }}>
            <Sparkles className="size-2.5" aria-hidden="true" />
            {item.agent_count} replies
          </span>
          {item.needs_attention ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#92400E]">
              <CircleExclamation className="size-2.5" aria-hidden="true" />
              Needs you
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

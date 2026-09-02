"use client";

import { Button } from "@heroui/react";
import { ArrowLeft, Check, Microphone as Mic, Pencil, Sparkles, Xmark } from "@gravity-ui/icons";

import type { AgenticChannel, AgenticDraft } from "@/services/api/agentic";
import { initialsFor } from "@/features/messages/types";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";
import { confidenceColor } from "@/features/messages/components/agentic/AgenticDraftCard";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export interface AgenticApprovalsQueueProps {
  drafts: AgenticDraft[];
  chatInfo: (chatId: string) => { name: string; avatarColor: string };
  channel?: AgenticChannel;
  busy?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onEdit: (draft: AgenticDraft) => void;
  onClose: () => void;
}

export function AgenticApprovalsQueue({
  drafts,
  chatInfo,
  channel = "telegram",
  busy,
  onApprove,
  onReject,
  onApproveAll,
  onEdit,
  onClose,
}: AgenticApprovalsQueueProps) {
  const n = drafts.length;
  const channelLabel = channel === "instagram" ? "Instagram" : "Telegram";
  const channelBadgeBg = channel === "instagram" ? "#E4405F" : "#26A5E4";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-black/[0.06] px-5 dark:border-white/10">
        <button type="button" onClick={onClose} className="-ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-[var(--default)]" aria-label="Back">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: AGENT_VIOLET }}>
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-foreground">Review drafts</div>
          <div className="text-[11px] text-foreground/45">{n} pending · {channelLabel}</div>
        </div>
        {n > 0 ? (
          <Button size="sm" onPress={onApproveAll} isDisabled={busy} className="text-white" style={{ backgroundColor: AGENT_VIOLET }}>
            Approve all ({n})
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--default)]/40 px-6 py-4">
        {drafts.map((d) => {
          const info = chatInfo(d.chat_id);
          return (
            <div key={d.id} className="rounded-xl border border-black/[0.06] border-l-[3px] bg-background p-4 dark:border-white/10" style={{ borderLeftColor: AGENT_VIOLET }}>
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ backgroundColor: info.avatarColor }}>
                  {initialsFor(info.name)}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{info.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: channelBadgeBg }}>{channelLabel}</span>
                <div className="flex-1" />
                <span className="text-[11px] text-foreground/40">{formatTime(d.created_at)}</span>
              </div>
              <p className="mb-2.5 text-[13px] leading-[19px] text-foreground">{d.draft_text}</p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-foreground/40">
                  {d.is_voice ? "Voice" : "Text"} · <span style={{ color: confidenceColor(d.confidence) }}>{d.confidence}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onPress={() => onApprove(d.id)} isDisabled={busy} className="text-white" style={{ backgroundColor: AGENT_VIOLET }}>Approve</Button>
                  <Button size="sm" variant="secondary" onPress={() => onEdit(d)} isDisabled={busy}>Edit</Button>
                  <Button size="sm" variant="secondary" onPress={() => onReject(d.id)} isDisabled={busy} className="text-danger">Reject</Button>
                </div>
              </div>
            </div>
          );
        })}
        {n === 0 ? (
          <div className="py-16 text-center">
            <Sparkles className="mx-auto mb-3 size-8" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
            <p className="font-semibold text-foreground">All caught up</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Switch } from "@heroui/react";
import { ArrowRotateLeft, Check, Clock as Timer, Microphone as Mic, Pencil, Sparkles, Xmark } from "@gravity-ui/icons";

import type { AgenticConfidence, AgenticDraft } from "@/services/api/agentic";
import { AGENT_VIOLET, CONFIDENCE_COLORS } from "@/features/messages/components/agentic/constants";

export function confidenceColor(c: AgenticConfidence): string {
  return CONFIDENCE_COLORS[c];
}

function fmtCountdown(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function useCountdown(target: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [target]);
  return remaining;
}

export interface AgenticDraftCardProps {
  draft: AgenticDraft;
  customerName: string;
  busy?: boolean;
  onApprove: (text: string, isVoice: boolean) => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  hideVoice?: boolean;
}

export function AgenticDraftCard({
  draft,
  customerName,
  busy,
  onApprove,
  onRegenerate,
  onDiscard,
  hideVoice = false,
}: AgenticDraftCardProps) {
  const [text, setText] = useState(draft.draft_text);
  const [isVoice, setIsVoice] = useState(draft.is_voice);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const remaining = useCountdown(draft.auto_send_at);
  const basedOn = Array.isArray(draft.based_on) ? draft.based_on : [];

  useEffect(() => {
    setText(draft.draft_text);
    setIsVoice(draft.is_voice);
    setEditing(false);
  }, [draft.id, draft.draft_text, draft.is_voice]);

  return (
    <div className="border-t-2 bg-background" style={{ borderTopColor: AGENT_VIOLET }}>
      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: AGENT_VIOLET }}>
              <Sparkles className="size-4" aria-hidden="true" />
              Agent draft
            </span>
            <span className="truncate text-[12px] text-foreground/50">→ {customerName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {remaining !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                <Timer className="size-3" aria-hidden="true" />
                Auto-sends in {fmtCountdown(remaining)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onDiscard}
              disabled={busy}
              className="inline-flex size-6 items-center justify-center rounded-full text-foreground/40 hover:bg-[var(--default)]"
              aria-label="Discard draft"
            >
              <Xmark className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {editing ? (
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-black/10 bg-[var(--default)] px-3 py-2.5 text-[13px] leading-[19px] text-foreground outline-none focus:border-[#7C3AED] dark:border-white/10"
          />
        ) : (
          <div className="whitespace-pre-wrap rounded-lg bg-[var(--default)] px-3 py-2.5 text-[13px] leading-[19px] text-foreground">
            {text}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          {!hideVoice ? (
            <div className="flex items-center gap-2">
              <Mic className="size-3.5 text-foreground/40" aria-hidden="true" />
              <span className="text-[12px] text-foreground/60">Send as voice</span>
              <Switch isSelected={isVoice} onChange={setIsVoice}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              {isVoice && draft.voice_duration_sec != null ? (
                <span className="text-[11px] text-foreground/40">≈ {fmtCountdown(draft.voice_duration_sec)}</span>
              ) : null}
            </div>
          ) : (
            <div />
          )}
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-foreground/40">
            <Sparkles className="size-3" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
            <span className="truncate">
              {basedOn.length ? `Based on ${basedOn.join(" + ")} · ` : ""}
              Confidence{" "}
              <span className="font-semibold" style={{ color: confidenceColor(draft.confidence) }}>
                {draft.confidence}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            onPress={() => onApprove(text, isVoice)}
            isDisabled={busy}
            className="text-white"
            style={{ backgroundColor: AGENT_VIOLET }}
          >
            <Check className="size-4" aria-hidden="true" />
            Approve & send
          </Button>
          <Button size="sm" variant="secondary" onPress={() => { setEditing(true); setTimeout(() => taRef.current?.focus(), 0); }} isDisabled={busy}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button size="sm" variant="secondary" onPress={onRegenerate} isDisabled={busy}>
            <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
            Regenerate
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onPress={onDiscard} isDisabled={busy} className="text-danger">
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}

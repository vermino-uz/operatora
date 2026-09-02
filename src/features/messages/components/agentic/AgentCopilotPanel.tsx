"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleExclamation,
  ArrowShapeTurnUpRight as Send,
  Microphone as Mic,
  Pause,
  Play,
  Sparkles,
  Xmark,
} from "@gravity-ui/icons";

import {
  useCopilotMessages,
  useCopilotSuggestions,
  useLeadActions,
  useRevertLeadAction,
  useSendCopilotCommand,
} from "@/features/messages/hooks/useAgentic";
import type { AgenticChannel, CopilotMessage } from "@/services/api/agentic";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface AgentCopilotPanelProps {
  chatId: string;
  chatName: string;
  channel?: AgenticChannel;
  agentEnabled: boolean;
  paused: boolean;
  targeted: boolean;
  busyToggle?: boolean;
  onTakeOver: () => void;
  onResume: () => void;
  onClose: () => void;
}

export function AgentCopilotPanel({
  chatId,
  chatName,
  channel = "telegram",
  agentEnabled,
  paused,
  targeted,
  busyToggle,
  onTakeOver,
  onResume,
  onClose,
}: AgentCopilotPanelProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messagesQ = useCopilotMessages(chatId, true, channel);
  const sendM = useSendCopilotCommand(chatId, channel);
  const leadQ = useLeadActions(chatId, true, channel);
  const revertM = useRevertLeadAction(chatId, channel);
  const suggestionsQ = useCopilotSuggestions(chatId, true, channel);

  const messages = useMemo(() => messagesQ.data || [], [messagesQ.data]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sendM.isPending]);

  const aiChips = suggestionsQ.data?.suggestions || [];
  const chips = aiChips.length ? aiChips : ["Send a voice note", "Summarize this chat", "Suggest a reply", ...(leadQ.data?.linked ? ["Mark lead as won"] : [])];

  const statusLabel = !agentEnabled ? "Agent off" : paused ? "You took over" : targeted ? "Agent active" : "Not targeted";
  const statusColor = !agentEnabled || !targeted ? "#6B7280" : paused ? "#92400E" : "#5B21B6";

  function handleSend() {
    const command = input.trim();
    if (!command || sendM.isPending) return;
    setInput("");
    sendM.mutate(command, { onError: () => setInput(command) });
  }

  return (
    <aside className="fixed inset-0 z-50 flex flex-col bg-background lg:static lg:inset-auto lg:z-auto lg:w-[300px] lg:shrink-0 lg:border-l lg:border-black/[0.06] min-h-0 dark:lg:border-white/10" data-testid="agent-copilot-panel">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#7C3AED1a" }}>
          <Sparkles className="size-4" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-tight text-foreground">Agent chat</div>
          <div className="truncate text-[11px] text-foreground/45">{chatName}</div>
        </div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-full text-foreground/40 hover:bg-[var(--default)]" aria-label="Close">
          <Xmark className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="shrink-0 border-b px-4 py-2.5" style={{ backgroundColor: paused ? "#FFFBEB" : "#7C3AED0d", borderColor: "#7C3AED1f" }}>
        <div className="flex items-start gap-2">
          <span className={`mt-1 size-2 shrink-0 rounded-full ${agentEnabled && targeted && !paused ? "animate-pulse" : ""}`} style={{ backgroundColor: paused ? "#F59E0B" : statusColor }} />
          <span className="flex-1 text-[11.5px] font-medium leading-snug" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
        {agentEnabled && paused ? (
          <button type="button" onClick={onResume} disabled={busyToggle} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: AGENT_VIOLET }}>
            <Play className="size-3.5" aria-hidden="true" /> Hand back to agent
          </button>
        ) : agentEnabled && targeted ? (
          <button type="button" onClick={onTakeOver} disabled={busyToggle} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border bg-background text-[11.5px] font-semibold disabled:opacity-50" style={{ color: AGENT_VIOLET, borderColor: "#7C3AED55" }}>
            <Pause className="size-3.5" aria-hidden="true" /> Take over
          </button>
        ) : null}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {messagesQ.isLoading ? (
          <div className="pt-8 text-center text-[12px] text-foreground/40">Loading…</div>
        ) : messages.length === 0 && !sendM.isPending ? (
          <div className="pt-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full" style={{ backgroundColor: "#7C3AED14" }}>
              <Sparkles className="size-5" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
            </div>
            <div className="mb-1 text-[13px] font-semibold text-foreground">Talk to the agent</div>
            <div className="mb-4 px-2 text-[11.5px] leading-relaxed text-foreground/45">Ask for analysis or tell it to compose a message — the customer won&apos;t see this side chat.</div>
            <div className="flex flex-col gap-1.5">
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => { setInput(c); taRef.current?.focus(); }} className="rounded-lg border px-3 py-2 text-left text-[11.5px] text-foreground/60 transition-colors hover:border-[#7C3AED55] hover:bg-[#7C3AED08]">{c}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <CopilotBubble key={m.id} m={m} />
            ))}
            {sendM.isPending ? (
              <div className="text-[11.5px] text-foreground/40">Thinking…</div>
            ) : null}
          </>
        )}
      </div>

      <div className="shrink-0 border-t px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={Math.min(4, Math.max(1, input.split("\n").length))}
            placeholder="Ask the agent…"
            disabled={sendM.isPending}
            className="flex-1 resize-none rounded-xl border border-black/10 bg-background px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#7C3AED88] disabled:opacity-60 dark:border-white/10"
          />
          <button type="button" onClick={handleSend} disabled={!input.trim() || sendM.isPending} className="flex size-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40" style={{ backgroundColor: AGENT_VIOLET }} aria-label="Send">
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function CopilotBubble({ m }: { m: CopilotMessage }) {
  if (m.role === "operator") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F1F5F9] px-3 py-2 text-[12.5px] leading-relaxed text-foreground dark:bg-white/10">{m.content}</div>
      </div>
    );
  }
  if (m.kind === "escalation" || m.action === "escalation") {
    return (
      <div className="rounded-xl border-l-4 px-3 py-2.5 text-[12.5px] leading-relaxed" style={{ backgroundColor: "#FFFBEB", borderColor: "#F59E0B", color: "#92400E" }}>
        <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase">
          <CircleExclamation className="size-3.5" aria-hidden="true" /> Needs attention
        </div>
        <div className="whitespace-pre-wrap break-words">{m.content}</div>
      </div>
    );
  }
  const sent = !!m.sent_message_id && !m.error;
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border px-3 py-2 text-[12.5px] leading-relaxed text-foreground" style={{ backgroundColor: "#7C3AED0a", borderColor: "#7C3AED1f" }}>
        {m.content}
        {sent ? (
          <div className="mt-2 border-t pt-2 text-[11px]" style={{ borderColor: "#7C3AED1f" }}>
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "#5B21B6" }}>
              {m.sent_is_voice ? <Mic className="size-3" aria-hidden="true" /> : null}
              {m.sent_is_voice ? "Sent voice" : "Sent to customer"}
            </span>
            {m.sent_text ? <div className="mt-1 italic text-foreground/60 line-clamp-3">“{m.sent_text}”</div> : null}
          </div>
        ) : null}
        {m.error ? (
          <div className="mt-2 flex items-start gap-1 border-t border-[#fecaca] pt-2 text-[11px] text-[#b91c1c]">
            <CircleExclamation className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{m.error}</span>
          </div>
        ) : null}
        <div className="mt-0.5 pl-1 text-[10px] text-foreground/40">{fmtTime(m.created_at)}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Tooltip } from "@heroui/react";
import {
  ArrowRightArrowLeft,
  CircleExclamation,
  ArrowShapeTurnUpRight as Send,
  Check,
  Copy,
  Microphone as Mic,
  Pause,
  Play,
  Sparkles,
  FileText,
  ArrowRotateLeft,
  Xmark,
} from "@gravity-ui/icons";

import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { StreamingBubble } from "@/features/chat/components/StreamingBubble";
import { useModelsQuery } from "@/features/chat/hooks/useModelsQuery";
import {
  useCopilotMessages,
  useCopilotSuggestions,
  useLeadActions,
  useRevertLeadAction,
  useSendCopilotCommand,
} from "@/features/messages/hooks/useAgentic";
import { useChannelWorkspaceCopilot } from "@/features/messages/hooks/useChannelWorkspaceCopilot";
import type { AgenticChannel, AgentLeadAction, CopilotMessage } from "@/services/api/agentic";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

type CopilotTab = "agent" | "workspace";

const WORKSPACE_STARTERS = [
  "Summarize this customer's conversation",
  "What stage is the linked lead in?",
  "Suggest follow-up tasks for this chat",
  "How many messages has this customer sent?",
] as const;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatCopilotError(error: string, channel: AgenticChannel): string {
  if (/BUSINESS_PEER_USAGE_MISSING/i.test(error)) {
    return "Instagram business messaging is not available for this account.";
  }
  if (/2534022/.test(error)) {
    return "Outside Instagram's 24-hour messaging window.";
  }
  return error;
}

export interface AgentCopilotPanelProps {
  chatId: string;
  chatName: string;
  workspaceId: string | null;
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
  workspaceId,
  channel = "telegram",
  agentEnabled,
  paused,
  targeted,
  busyToggle,
  onTakeOver,
  onResume,
  onClose,
}: AgentCopilotPanelProps) {
  const [tab, setTab] = useState<CopilotTab>("agent");
  const [input, setInput] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messagesQ = useCopilotMessages(chatId, tab === "agent", channel);
  const sendM = useSendCopilotCommand(chatId, channel);
  const leadQ = useLeadActions(chatId, tab === "agent", channel);
  const revertM = useRevertLeadAction(chatId, channel);
  const suggestionsQ = useCopilotSuggestions(chatId, tab === "agent", channel);
  const modelsQuery = useModelsQuery(workspaceId);

  const workspaceContext = useMemo(
    () =>
      workspaceId
        ? {
            channel,
            chatId,
            chatName,
            linkedLeadId: leadQ.data?.lead?.lead_id ?? null,
            leadColumn: leadQ.data?.lead?.column_name ?? null,
          }
        : null,
    [workspaceId, channel, chatId, chatName, leadQ.data?.lead],
  );

  const workspace = useChannelWorkspaceCopilot(workspaceId, workspaceContext);

  const messages = useMemo(() => messagesQ.data || [], [messagesQ.data]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [
    messages.length,
    sendM.isPending,
    tab,
    workspace.messages.length,
    workspace.streaming.text,
    workspace.streaming.cards.length,
  ]);

  const aiChips = suggestionsQ.data?.suggestions || [];
  const chips = aiChips.length
    ? aiChips
    : [
        "Send a voice note",
        "Summarize this chat",
        "Suggest a reply",
        ...(leadQ.data?.linked ? ["Mark lead as won"] : []),
      ];

  const statusLabel = !agentEnabled ? "Agent off" : paused ? "You took over" : targeted ? "Agent active" : "Not targeted";
  const statusColor = !agentEnabled || !targeted ? "#6B7280" : paused ? "#92400E" : "#5B21B6";

  function handleAgentSend() {
    const command = input.trim();
    if (!command || sendM.isPending) return;
    setInput("");
    sendM.mutate(command, { onError: () => setInput(command) });
  }

  function handleWorkspaceSend() {
    const command = input.trim();
    if (!command || workspace.isSending) return;
    setInput("");
    void workspace.send(command);
  }

  const activeModel =
    modelsQuery.data?.allowed.find((m) => m.id === workspace.model) ??
    modelsQuery.data?.allowed[0];

  return (
    <aside
      className="fixed inset-0 z-50 flex flex-col bg-background lg:static lg:inset-auto lg:z-auto lg:w-[300px] lg:shrink-0 lg:border-l lg:border-black/[0.06] min-h-0 dark:lg:border-white/10"
      data-testid="agent-copilot-panel"
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#7C3AED1a" }}>
          <Sparkles className="size-4" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-tight text-foreground">Copilot</div>
          <div className="truncate text-[11px] text-foreground/45">{chatName}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full text-foreground/40 hover:bg-[var(--default)]"
          aria-label="Close"
        >
          <Xmark className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex shrink-0 border-b px-2 py-1.5">
        <div className="flex w-full gap-1 rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          <TabButton active={tab === "agent"} onClick={() => setTab("agent")}>
            Agent
          </TabButton>
          <TabButton active={tab === "workspace"} onClick={() => setTab("workspace")} disabled={!workspaceId}>
            Workspace AI
          </TabButton>
        </div>
      </div>

      {tab === "agent" ? (
        <>
          <div className="shrink-0 border-b px-4 py-2.5" style={{ backgroundColor: paused ? "#FFFBEB" : "#7C3AED0d", borderColor: "#7C3AED1f" }}>
            <div className="flex items-start gap-2">
              <span
                className={`mt-1 size-2 shrink-0 rounded-full ${agentEnabled && targeted && !paused ? "animate-pulse" : ""}`}
                style={{ backgroundColor: paused ? "#F59E0B" : statusColor }}
              />
              <span className="flex-1 text-[11.5px] font-medium leading-snug" style={{ color: statusColor }}>
                {statusLabel}
              </span>
            </div>
            {agentEnabled && paused ? (
              <button
                type="button"
                onClick={onResume}
                disabled={busyToggle}
                className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: AGENT_VIOLET }}
              >
                <Play className="size-3.5" aria-hidden="true" /> Hand back to agent
              </button>
            ) : agentEnabled && targeted ? (
              <button
                type="button"
                onClick={onTakeOver}
                disabled={busyToggle}
                className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border bg-background text-[11.5px] font-semibold disabled:opacity-50"
                style={{ color: AGENT_VIOLET, borderColor: "#7C3AED55" }}
              >
                <Pause className="size-3.5" aria-hidden="true" /> Take over
              </button>
            ) : null}
          </div>

          {leadQ.data?.linked && leadQ.data.lead ? (
            <div className="shrink-0 border-b px-4 py-2">
              <button type="button" onClick={() => setLeadOpen((v) => !v)} className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                  <span className={`transition-transform ${leadOpen ? "rotate-90" : ""}`}>›</span>
                  Linked lead
                  {leadQ.data.actions.length > 0 ? (
                    <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-foreground/45 dark:bg-white/[0.08]">
                      {leadQ.data.actions.length}
                    </span>
                  ) : null}
                </span>
                {leadQ.data.lead.column_name ? (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ backgroundColor: "#7C3AED14", color: "#5B21B6" }}>
                    {leadQ.data.lead.column_name}
                  </span>
                ) : null}
              </button>
              {leadOpen ? (
                leadQ.data.actions.length === 0 ? (
                  <div className="mt-2 text-[11px] leading-snug text-foreground/45">No CRM actions yet.</div>
                ) : (
                  <div className="mt-1.5 max-h-[132px] space-y-1 overflow-y-auto pr-1">
                    {leadQ.data.actions.map((a) => (
                      <LeadActionRow key={a.id} action={a} busy={revertM.isPending} onUndo={() => revertM.mutate(a.id)} />
                    ))}
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {messagesQ.isLoading ? (
              <div className="pt-8 text-center text-[12px] text-foreground/40">Loading…</div>
            ) : messages.length === 0 && !sendM.isPending ? (
              <EmptyAgentState chips={chips} onPick={(c) => { setInput(c); taRef.current?.focus(); }} />
            ) : (
              <>
                {messages.map((m) => (
                  <CopilotBubble key={m.id} m={m} channel={channel} />
                ))}
                {sendM.isPending ? (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F1F5F9] px-3 py-2 text-[12.5px] leading-relaxed text-foreground dark:bg-white/10">
                        {typeof sendM.variables === "string" ? sendM.variables : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-1 text-[11.5px] text-foreground/40">
                      <span className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: AGENT_VIOLET }} />
                      Thinking…
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          <CopilotComposer
            input={input}
            onInputChange={setInput}
            onSend={handleAgentSend}
            disabled={sendM.isPending}
            placeholder="Ask the agent…"
            hint="Private side chat — the customer won't see this."
            chips={messages.length > 0 && !sendM.isPending ? aiChips.slice(0, 3) : []}
            onPickChip={(c) => { setInput(c); taRef.current?.focus(); }}
            textareaRef={taRef}
          />
        </>
      ) : (
        <>
          <div className="shrink-0 border-b px-4 py-2 text-[11px] leading-snug text-foreground/50">
            Full workspace AI — leads, analytics, tasks, and CRM cards with this chat as context.
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
            {workspace.messages.length === 0 && workspace.streaming.phase === "idle" ? (
              <div className="px-4 pt-4">
                <p className="mb-3 text-[12px] font-semibold text-foreground">Workspace AI</p>
                <p className="mb-3 text-[11px] leading-relaxed text-foreground/45">
                  Ask about leads, performance, or this conversation — same assistant as the dashboard.
                </p>
                <div className="flex flex-col gap-1.5">
                  {WORKSPACE_STARTERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => void workspace.send(c)}
                      disabled={workspace.isSending}
                      className="rounded-lg border px-3 py-2 text-left text-[11.5px] text-foreground/60 transition-colors hover:border-[#7C3AED55] hover:bg-[#7C3AED08] disabled:opacity-50"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {workspace.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} threadId={null} />
                ))}
                <StreamingBubble streaming={workspace.streaming} threadId={null} />
              </div>
            )}
          </div>

          <WorkspaceComposer
            input={input}
            onInputChange={setInput}
            onSend={handleWorkspaceSend}
            onStop={() => void workspace.stop()}
            isSending={workspace.isSending}
            model={workspace.model}
            onModelChange={workspace.setModel}
            modelOptions={modelsQuery.data?.allowed}
            activeModelLabel={activeModel?.label ?? activeModel?.name}
            textareaRef={taRef}
          />
        </>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyAgentState({ chips, onPick }: { chips: string[]; onPick: (c: string) => void }) {
  return (
    <div className="pt-6 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full" style={{ backgroundColor: "#7C3AED14" }}>
        <Sparkles className="size-5" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
      </div>
      <div className="mb-1 text-[13px] font-semibold text-foreground">Talk to the agent</div>
      <div className="mb-4 px-2 text-[11.5px] leading-relaxed text-foreground/45">
        Ask for analysis or tell it to compose a message — the customer won&apos;t see this side chat.
      </div>
      <div className="flex flex-col gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className="rounded-lg border px-3 py-2 text-left text-[11.5px] text-foreground/60 transition-colors hover:border-[#7C3AED55] hover:bg-[#7C3AED08]"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function CopilotComposer({
  input,
  onInputChange,
  onSend,
  disabled,
  placeholder,
  hint,
  chips,
  onPickChip,
  textareaRef,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder: string;
  hint?: string;
  chips?: string[];
  onPickChip?: (c: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="shrink-0 border-t px-3 py-3">
      {chips && chips.length > 0 ? (
        <div className="mb-2 flex flex-col gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPickChip?.(c)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-[11.5px] text-foreground/60 transition-colors hover:border-[#7C3AED55] hover:bg-[#7C3AED08]"
            >
              <Sparkles className="size-3 shrink-0" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
              <span className="min-w-0 truncate">{c}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={Math.min(4, Math.max(1, input.split("\n").length))}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-black/10 bg-background px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#7C3AED88] disabled:opacity-60 dark:border-white/10"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!input.trim() || disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ backgroundColor: AGENT_VIOLET }}
          aria-label="Send"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>
      {hint ? <div className="mt-1.5 px-1 text-[10.5px] text-foreground/40">{hint}</div> : null}
    </div>
  );
}

function WorkspaceComposer({
  input,
  onInputChange,
  onSend,
  onStop,
  isSending,
  model,
  onModelChange,
  modelOptions,
  activeModelLabel,
  textareaRef,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isSending: boolean;
  model: string;
  onModelChange: (m: import("@/features/chat/types").ChatModelId) => void;
  modelOptions?: Array<{ id: string; label?: string; name?: string }>;
  activeModelLabel?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="shrink-0 border-t px-3 py-3">
      {modelOptions && modelOptions.length > 1 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {modelOptions.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModelChange(m.id as import("@/features/chat/types").ChatModelId)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                model === m.id ? "text-white" : "bg-black/[0.04] text-foreground/55 dark:bg-white/[0.06]"
              }`}
              style={model === m.id ? { backgroundColor: AGENT_VIOLET } : undefined}
            >
              {m.label ?? m.name ?? m.id}
            </button>
          ))}
        </div>
      ) : activeModelLabel ? (
        <div className="mb-2 text-[10px] text-foreground/40">Model: {activeModelLabel}</div>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={Math.min(4, Math.max(1, input.split("\n").length))}
          placeholder="Ask workspace AI…"
          disabled={isSending}
          className="flex-1 resize-none rounded-xl border border-black/10 bg-background px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#7C3AED88] disabled:opacity-60 dark:border-white/10"
        />
        {isSending ? (
          <Button size="sm" variant="secondary" onPress={onStop} aria-label="Stop">
            Stop
          </Button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
            style={{ backgroundColor: AGENT_VIOLET }}
            aria-label="Send"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function LeadActionRow({
  action,
  busy,
  onUndo,
}: {
  action: AgentLeadAction;
  busy?: boolean;
  onUndo: () => void;
}) {
  const isStatus = action.action === "status_change";
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#7C3AED12" }}>
        {isStatus ? (
          <ArrowRightArrowLeft className="size-3" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        ) : (
          <FileText className="size-3" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="break-words text-[11.5px] leading-snug text-foreground">
          {action.summary}
          {action.source === "auto" ? <span className="ml-1 text-[9.5px] text-foreground/40">· auto</span> : null}
        </div>
      </div>
      {action.reverted ? (
        <span className="mt-0.5 shrink-0 text-[10px] text-foreground/40">Undone</span>
      ) : (
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[10.5px] font-semibold text-foreground/40 hover:text-[#b91c1c] disabled:opacity-50"
          title="Undo"
        >
          <ArrowRotateLeft className="size-3" aria-hidden="true" />
          Undo
        </button>
      )}
    </div>
  );
}

function CopilotCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip delay={200}>
      <button
        type="button"
        aria-label="Copy message"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // ignore
          }
        }}
        className="mt-1 inline-flex size-6 items-center justify-center rounded-md text-foreground/35 hover:bg-black/[0.04] hover:text-foreground/60 dark:hover:bg-white/[0.06]"
      >
        {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
      </button>
      <Tooltip.Content placement="top">{copied ? "Copied" : "Copy"}</Tooltip.Content>
    </Tooltip>
  );
}

function EscalationBubble({ m }: { m: CopilotMessage }) {
  const [open, setOpen] = useState(false);
  const hasRecap = !!(m.recap && m.recap.trim());
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full">
        <div className="rounded-xl border-l-4 px-3 py-2.5 text-[12.5px] leading-relaxed" style={{ backgroundColor: "#FFFBEB", borderColor: "#F59E0B", color: "#92400E" }}>
          <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase">
            <CircleExclamation className="size-3.5" aria-hidden="true" /> Needs attention
          </div>
          <div className="whitespace-pre-wrap break-words">{m.content}</div>
          {hasRecap ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold underline decoration-dotted"
                style={{ color: "#B45309" }}
              >
                {open ? "Hide recap" : "Show recap"}
              </button>
              {open ? (
                <div className="mt-1.5 whitespace-pre-wrap break-words border-t pt-1.5 text-[11.5px]" style={{ borderColor: "#F59E0B55" }}>
                  {m.recap}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="mt-0.5 pl-1 text-[10px] text-foreground/40">{fmtTime(m.created_at)}</div>
      </div>
    </div>
  );
}

function CopilotBubble({ m, channel }: { m: CopilotMessage; channel: AgenticChannel }) {
  if (m.role === "operator") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-br-md bg-[#F1F5F9] px-3 py-2 text-[12.5px] leading-relaxed text-foreground dark:bg-white/10">
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
          </div>
          <div className="mt-0.5 pr-1 text-right text-[10px] text-foreground/40">{fmtTime(m.created_at)}</div>
        </div>
      </div>
    );
  }

  if (m.kind === "escalation" || m.action === "escalation") {
    return <EscalationBubble m={m} />;
  }

  const sent = !!m.sent_message_id && !m.error;
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%]">
        <div
          className="rounded-2xl rounded-bl-md border px-3 py-2 text-[12.5px] leading-relaxed text-foreground"
          style={{ backgroundColor: "#7C3AED0a", borderColor: "#7C3AED1f" }}
        >
          <div className="chat-markdown break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </div>
          {sent ? (
            <div className="mt-2 border-t pt-2 text-[11px]" style={{ borderColor: "#7C3AED1f" }}>
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "#5B21B6" }}>
                {m.sent_is_voice ? <Mic className="size-3" aria-hidden="true" /> : null}
                {m.sent_is_voice ? "Sent voice" : "Sent to customer"}
              </span>
              {m.sent_text ? <div className="mt-1 line-clamp-3 italic text-foreground/60">“{m.sent_text}”</div> : null}
            </div>
          ) : null}
          {m.error ? (
            <div className="mt-2 flex items-start gap-1 border-t border-[#fecaca] pt-2 text-[11px] text-[#b91c1c]">
              <CircleExclamation className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">Send failed: {formatCopilotError(m.error, channel)}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-0.5 inline-flex items-center gap-1 pl-1 text-[10px] text-foreground/40">
          <Sparkles className="size-2.5" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
          {fmtTime(m.created_at)}
          <CopilotCopyButton text={m.content} />
        </div>
      </div>
    </div>
  );
}

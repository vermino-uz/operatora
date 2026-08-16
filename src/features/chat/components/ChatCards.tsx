"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Chip, Tooltip } from "@heroui/react";
import {
  TriangleExclamation as AlertTriangle,
  ArrowUpRightFromSquare as ExternalLink,
  CirclePlay as PlayCircle,
  Sparkles,
  Person as User,
} from "@gravity-ui/icons";
import { useTheme } from "next-themes";

import { useSessionStore } from "@/state/session-store";
import { chatThreadsApi } from "@/services/api/chat";
import { ApiError } from "@/types/api";
import type {
  ChatCard,
  ConversationCardPayload,
  LeadCardPayload,
} from "@/features/chat/types";

export interface ChatCardRendererProps {
  card: ChatCard;
  /** Needed to call the choice-consume endpoint — identifies which message
   * and which card index within that message this render came from. */
  messageId: string;
  cardIndex: number;
  threadId: string | null;
}

// --- Small shared building blocks ------------------------------------------------

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`mt-2 max-w-lg rounded-2xl border border-black/[0.08] bg-background p-3 shadow-sm dark:border-white/10 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// `Button`'s `render` prop can't safely polymorph into an `<a>`/`Link`
// (its prop types are pinned to `HTMLButtonElement`) — these two card
// actions link out, so they're styled to match `Button size="sm"
// variant="secondary"` directly instead of fighting that type mismatch.
const LINK_BUTTON_CLASSES =
  "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]";

function formatDuration(sec?: number): string {
  if (!sec && sec !== 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LeadRow({ lead }: { lead: LeadCardPayload }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] py-2 last:border-0 dark:border-white/10">
      <div className="flex min-w-0 items-center gap-2">
        <User className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.name}</p>
          <p className="truncate text-xs text-foreground/50">{lead.phone}</p>
        </div>
      </div>
      <Chip size="sm" color="accent" variant="soft">
        <Chip.Label>{lead.status}</Chip.Label>
      </Chip>
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationCardPayload }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/[0.06] py-2 last:border-0 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{conversation.clientName}</p>
        <Chip size="sm" variant="soft">
          <Chip.Label>{formatDuration(conversation.durationSec)}</Chip.Label>
        </Chip>
      </div>
      <p className="truncate text-xs text-foreground/50">
        {conversation.operatorName} · score {conversation.aiScore} · {conversation.status}
      </p>
      <p className="line-clamp-2 text-xs text-foreground/70">{conversation.summary}</p>
    </div>
  );
}

// --- Interactive cards (real endpoints traced — see feature brief) --------------

function LeadCard({ card }: { card: Extract<ChatCard, { kind: "lead" }> }) {
  return (
    <CardShell>
      <LeadRow lead={card.lead} />
    </CardShell>
  );
}

function LeadsCard({ card }: { card: Extract<ChatCard, { kind: "leads" }> }) {
  return (
    <CardShell>
      <p className="mb-1 text-xs font-semibold text-foreground/60">{card.leads.length} leads</p>
      {card.leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} />
      ))}
    </CardShell>
  );
}

function ConversationCard({ card }: { card: Extract<ChatCard, { kind: "conversation" }> }) {
  return (
    <CardShell>
      <ConversationRow conversation={card.conversation} />
    </CardShell>
  );
}

function ConversationsCard({ card }: { card: Extract<ChatCard, { kind: "conversations" }> }) {
  return (
    <CardShell>
      <p className="mb-1 text-xs font-semibold text-foreground/60">{card.conversations.length} conversations</p>
      {card.conversations.map((c) => (
        <ConversationRow key={c.id} conversation={c} />
      ))}
    </CardShell>
  );
}

function TranscriptCard({ card }: { card: Extract<ChatCard, { kind: "transcript" }> }) {
  const { transcript } = card;
  return (
    <CardShell className="max-w-xl">
      <div className="mb-2 flex items-center justify-between text-xs text-foreground/50">
        <span>{transcript.dateLabel ?? "Transcript"}</span>
        <span>{transcript.durationLabel}</span>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {transcript.turns.map((turn, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              turn.role === "operator"
                ? "self-start bg-black/[0.04] dark:bg-white/[0.06]"
                : "self-end bg-accent/10"
            } ${turn.highlight ? "ring-1 ring-warning" : ""}`}
          >
            <p className="text-[11px] font-medium text-foreground/50">{turn.speaker}</p>
            <p>{turn.text}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function AudioCard({ card }: { card: Extract<ChatCard, { kind: "audio" }> }) {
  const { audio } = card;
  return (
    <CardShell>
      <div className="flex items-center gap-2">
        <PlayCircle className="size-5 shrink-0 text-foreground/50" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{audio.label}</p>
          {audio.subLabel ? <p className="truncate text-xs text-foreground/50">{audio.subLabel}</p> : null}
        </div>
        {audio.durationSec ? (
          <span className="text-xs text-foreground/50">{formatDuration(audio.durationSec)}</span>
        ) : null}
      </div>
      {/* No dedicated player component exists yet — a plain HTML5 element is
       * explicitly allowed by the feature brief for this compact case. */}
      {audio.hasAudio !== false ? (
        <audio controls className="mt-2 w-full" preload="none">
          {/* No signed-URL endpoint was part of this pass's scope — the
           * conversationId alone isn't a playable src; this element is
           * wired up structurally so a real src can be dropped in once the
           * signed-URL lookup for `audio.conversationId` is built. */}
        </audio>
      ) : null}
    </CardShell>
  );
}

function GeneratedImageCard({ card }: { card: Extract<ChatCard, { kind: "generated_image" }> }) {
  const { generatedImage } = card;
  return (
    <CardShell>
      {generatedImage.mediaKind === "video" ? (
        <video src={generatedImage.url} controls className="w-full rounded-xl" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote, workspace-scoped media; not worth next/image config here.
        <img src={generatedImage.url} alt={generatedImage.prompt} className="w-full rounded-xl object-cover" />
      )}
      <p className="mt-2 line-clamp-2 text-xs text-foreground/60">{generatedImage.prompt}</p>
    </CardShell>
  );
}

function ChoiceRequestCard({ card, messageId, cardIndex, threadId }: ChatCardRendererProps & {
  card: Extract<ChatCard, { kind: "choice_request" }>;
}) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [consumed, setConsumed] = useState(card.choiceRequest.consumed ?? false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleChoose(optionId: string) {
    if (!workspaceId || !threadId || consumed || pendingId) return;
    setPendingId(optionId);
    setNote(null);
    try {
      await chatThreadsApi.consumeChoice(workspaceId, threadId, messageId, cardIndex);
      setConsumed(true);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        // Compare-and-set conflict — someone already answered this choice.
        // Per the feature brief, this is not an error, just a "stale" state.
        setConsumed(true);
        setNote("This choice was already answered.");
      } else {
        setNote("Couldn't submit your choice. Please try again.");
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <CardShell>
      <p className="mb-2 text-sm font-medium">{card.choiceRequest.title}</p>
      {note ? <p className="mb-2 text-xs text-foreground/50">{note}</p> : null}
      <div className="flex flex-wrap gap-2">
        {(card.choiceRequest.options ?? []).map((opt) => (
          <Button
            key={opt.id}
            size="sm"
            variant={consumed ? "tertiary" : "secondary"}
            isDisabled={consumed}
            isPending={pendingId === opt.id}
            onPress={() => handleChoose(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </CardShell>
  );
}

function ActionRequiredCard({ card }: { card: Extract<ChatCard, { kind: "action_required" }> }) {
  const { actionRequired } = card;
  const href = actionRequired.settingsTarget
    ? `/settings?target=${encodeURIComponent(actionRequired.settingsTarget)}`
    : "/settings";
  return (
    <CardShell className="border-warning/40 bg-warning/5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{actionRequired.title}</p>
          <p className="mt-0.5 text-xs text-foreground/60">{actionRequired.message}</p>
          <Link href={href} className={LINK_BUTTON_CLASSES}>
            {actionRequired.actionLabel ?? "Finish setup"}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </CardShell>
  );
}

function FeatureUnavailableCard({ card }: { card: Extract<ChatCard, { kind: "feature_unavailable" }> }) {
  return (
    <CardShell>
      <p className="text-sm font-medium">{card.featureUnavailable.title}</p>
      <p className="mt-0.5 text-xs text-foreground/60">{card.featureUnavailable.message}</p>
      <Chip size="sm" className="mt-2">
        <Chip.Label>Coming soon</Chip.Label>
      </Chip>
    </CardShell>
  );
}

function ThemeToggleCard({ card }: { card: Extract<ChatCard, { kind: "theme_toggle" }> }) {
  const { setTheme } = useTheme();
  return (
    <CardShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{card.themeToggle.title}</p>
          <p className="text-xs text-foreground/60">{card.themeToggle.description}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => setTheme(card.themeToggle.intent === "light" ? "light" : "dark")}
        >
          {card.themeToggle.intent === "light" ? "Switch to light" : "Switch to dark"}
        </Button>
      </div>
    </CardShell>
  );
}

// --- Deferred / read-only cards ---------------------------------------------
// Backend write/confirm endpoints for these were not traced in this pass
// (see the feature brief's "Explicitly not part of this pass" list) — render
// informational content only, with any action visibly disabled rather than
// silently no-op'ing or guessing an endpoint shape.

function DeferredActionButton({ label }: { label: string }) {
  return (
    <Tooltip delay={200}>
      <Button size="sm" variant="tertiary" isDisabled>
        {label}
      </Button>
      <Tooltip.Content placement="top">Not yet available in this preview</Tooltip.Content>
    </Tooltip>
  );
}

function AutomationFlowCard({ card }: { card: Extract<ChatCard, { kind: "automation_flow" }> }) {
  return (
    <CardShell>
      <p className="text-sm font-medium">{card.automationFlow.title ?? "Automation flow"}</p>
      {card.automationFlow.description ? (
        <p className="mt-0.5 text-xs text-foreground/60">{card.automationFlow.description}</p>
      ) : null}
      <div className="mt-2">
        <DeferredActionButton label="Insert flow" />
      </div>
    </CardShell>
  );
}

function TaskProposalCard({ card }: { card: Extract<ChatCard, { kind: "task_proposal" }> }) {
  return (
    <CardShell>
      <p className="text-sm font-medium">{card.taskProposal.title ?? "Task proposal"}</p>
      {card.taskProposal.description ? (
        <p className="mt-0.5 text-xs text-foreground/60">{card.taskProposal.description}</p>
      ) : null}
      <div className="mt-2">
        <DeferredActionButton label="Create task" />
      </div>
    </CardShell>
  );
}

function MeetingProposalCard({ card }: { card: Extract<ChatCard, { kind: "meeting_proposal" }> }) {
  return (
    <CardShell>
      <p className="text-sm font-medium">{card.meetingProposal.title ?? "Meeting proposal"}</p>
      {card.meetingProposal.description ? (
        <p className="mt-0.5 text-xs text-foreground/60">{card.meetingProposal.description}</p>
      ) : null}
      <div className="mt-2">
        <DeferredActionButton label="Schedule meeting" />
      </div>
    </CardShell>
  );
}

function SuperAgentTaskCard({ card }: { card: Extract<ChatCard, { kind: "super_agent_task" }> }) {
  return (
    <CardShell>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium">{card.superAgentTask.title ?? "Super agent task"}</p>
      </div>
      {card.superAgentTask.status ? (
        <Chip size="sm" className="mt-2">
          <Chip.Label>{card.superAgentTask.status}</Chip.Label>
        </Chip>
      ) : null}
    </CardShell>
  );
}

function SuperAgentQuestionCard({ card }: { card: Extract<ChatCard, { kind: "super_agent_question" }> }) {
  return (
    <CardShell>
      <p className="text-sm font-medium">{card.superAgentQuestion.question ?? "Super agent question"}</p>
      <p className="mt-1 text-xs text-foreground/50">Answer submission isn&apos;t available in this preview.</p>
    </CardShell>
  );
}

function SmsComposeCard({ card }: { card: Extract<ChatCard, { kind: "sms_compose" }> }) {
  return (
    <CardShell>
      <p className="mb-1 text-xs font-semibold text-foreground/60">SMS templates (read-only)</p>
      {(card.smsCompose.templates ?? []).map((tpl, i) => (
        <div key={tpl.id ?? i} className="rounded-xl bg-black/[0.04] p-2 text-sm dark:bg-white/[0.06]">
          {tpl.label ? <p className="text-xs font-medium text-foreground/60">{tpl.label}</p> : null}
          <p>{tpl.text}</p>
        </div>
      ))}
    </CardShell>
  );
}

function HiggsfieldConnectCard({ card }: { card: Extract<ChatCard, { kind: "higgsfield_connect" }> }) {
  const { higgsfieldConnect } = card;
  return (
    <CardShell>
      <p className="text-sm font-medium">{higgsfieldConnect.title ?? "Connect Higgsfield"}</p>
      {higgsfieldConnect.message ? (
        <p className="mt-0.5 text-xs text-foreground/60">{higgsfieldConnect.message}</p>
      ) : null}
      {higgsfieldConnect.registerUrl ? (
        <a href={higgsfieldConnect.registerUrl} target="_blank" rel="noreferrer" className={LINK_BUTTON_CLASSES}>
          Connect
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </CardShell>
  );
}

// --- Dispatcher --------------------------------------------------------------

export function ChatCardRenderer(props: ChatCardRendererProps) {
  const { card } = props;
  switch (card.kind) {
    case "lead":
      return <LeadCard card={card} />;
    case "leads":
      return <LeadsCard card={card} />;
    case "conversation":
      return <ConversationCard card={card} />;
    case "conversations":
      return <ConversationsCard card={card} />;
    case "transcript":
      return <TranscriptCard card={card} />;
    case "audio":
      return <AudioCard card={card} />;
    case "generated_image":
      return <GeneratedImageCard card={card} />;
    case "choice_request":
      return <ChoiceRequestCard {...props} card={card} />;
    case "action_required":
      return <ActionRequiredCard card={card} />;
    case "feature_unavailable":
      return <FeatureUnavailableCard card={card} />;
    case "theme_toggle":
      return <ThemeToggleCard card={card} />;
    case "automation_flow":
      return <AutomationFlowCard card={card} />;
    case "task_proposal":
      return <TaskProposalCard card={card} />;
    case "meeting_proposal":
      return <MeetingProposalCard card={card} />;
    case "super_agent_task":
      return <SuperAgentTaskCard card={card} />;
    case "super_agent_question":
      return <SuperAgentQuestionCard card={card} />;
    case "sms_compose":
      return <SmsComposeCard card={card} />;
    case "higgsfield_connect":
      return <HiggsfieldConnectCard card={card} />;
    default:
      return null;
  }
}

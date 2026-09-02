"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip, Dropdown } from "@heroui/react";
import {
  ArrowLeft,
  CircleCheck,
  CircleExclamation,
  Clock,
  FileText,
  Flag,
  Handset,
  Bulb,
  Link as LinkIcon,
  Persons,
  Sparkles,
  Star,
  StarFill,
  Ellipsis,
} from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useConversationQuery } from "@/features/conversations/hooks/useConversationQuery";
import { useSessionStore } from "@/state/session-store";
import { ConversationInlineAudioPlayer } from "@/features/conversations/components/ConversationInlineAudioPlayer";
import { ConversationAssistantDialog } from "@/features/conversations/components/ConversationAssistantDialog";
import { LinkLeadDialog } from "@/features/conversations/components/LinkLeadDialog";
import { getLinkedLeadId } from "@/services/api/leadConversationLinks";
import { leadSearchApi } from "@/services/api/leadSearch";
import {
  parseEvaluationCriteria,
  parseTranscript,
  type Conversation,
} from "@/features/conversations/types";
import {
  formatBytes,
  formatConversationTime,
  formatPhoneForDisplay,
  getConversationClientDisplayName,
  getInitial,
} from "@/features/conversations/utils/conversationDisplay";

export interface ConversationDetailPanelProps {
  conversationId: string;
  onBack?: () => void;
}

function SectionHeader({
  icon: Icon,
  title,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className={`mb-3 flex items-center gap-2 ${toneCls}`}>
      <Icon className="size-4" aria-hidden="true" />
      <h4 className="text-[13px] font-semibold uppercase tracking-wider">{title}</h4>
    </div>
  );
}

function DetailSection({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-divider bg-background p-5">{children}</section>;
}

function EmptyDetail() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-[var(--default)]">
        <Handset className="size-9 text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-[18px] font-semibold text-foreground">Select a conversation</h3>
      <p className="mt-1.5 max-w-[360px] text-[14px] text-muted">
        Choose a call from the list to view the recording, transcript, and AI analysis.
      </p>
    </div>
  );
}

function LinkedLeadChip({ conversation, onOpenDialog }: { conversation: Conversation; onOpenDialog: () => void }) {
  const linkedLeadId = getLinkedLeadId(conversation.entities);
  const leadQuery = useQuery({
    queryKey: ["lead-search-by-ids", linkedLeadId],
    queryFn: () => leadSearchApi.byIds([linkedLeadId as string]),
    enabled: Boolean(linkedLeadId),
    staleTime: 30_000,
  });

  if (!linkedLeadId) {
    return (
      <Dropdown.Item id="link-lead" onAction={onOpenDialog}>
        <LinkIcon className="size-4" />
        Link lead
      </Dropdown.Item>
    );
  }

  return (
    <Dropdown.Item id="link-lead" onAction={onOpenDialog}>
      <LinkIcon className="size-4" />
      Lead: {leadQuery.data?.[0]?.name ?? "…"}
    </Dropdown.Item>
  );
}

function DetailBody({ conversation, workspaceId }: { conversation: Conversation; workspaceId: string | null }) {
  const [showAi, setShowAi] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const evaluationEntries = parseEvaluationCriteria(conversation.evaluation_criteria);
  const displayName =
    getConversationClientDisplayName(conversation) ||
    formatPhoneForDisplay(conversation.client_phone) ||
    "Unknown";
  const fileName = conversation.audio_file_path?.split("/").pop() || "recording";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start gap-4 border-b border-divider bg-background px-4 py-5 md:px-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-[18px] font-semibold text-accent-foreground">
          {getInitial(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-semibold text-foreground">{displayName}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {conversation.operator_name || "—"} · {conversation.duration || "—"} ·{" "}
            {formatConversationTime(conversation)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {conversation.ai_score != null && conversation.ai_score > 0 ? (
              <div className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--default)] px-2.5 text-[12px] font-semibold text-foreground">
                <StarFill className="size-3 text-warning" aria-hidden="true" />
                {conversation.ai_score}/100
              </div>
            ) : null}
            {conversation.sentiment ? (
              <Chip size="sm" variant="soft" className="h-6 capitalize">
                {conversation.sentiment}
              </Chip>
            ) : null}
            {conversation.status ? (
              <Chip size="sm" variant="soft" className="h-6 capitalize">
                {conversation.status.replace(/_/g, " ")}
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onPress={() => setShowAi(true)}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI
          </Button>
          <Dropdown>
            <Dropdown.Trigger
              aria-label="More actions"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-divider bg-background text-foreground/70 transition-colors hover:bg-[var(--default)] hover:text-foreground"
            >
              <Ellipsis className="size-4" aria-hidden="true" />
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Conversation actions">
                <LinkedLeadChip conversation={conversation} onOpenDialog={() => setShowLinkDialog(true)} />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--default)] px-4 py-5 md:px-5">
        <div className="flex w-full min-w-0 flex-col gap-5">
          <ConversationInlineAudioPlayer
            conversationId={conversation.id}
            hasAudio={Boolean(conversation.audio_file_path)}
            fileName={fileName}
            title={displayName}
            subtitle={conversation.operator_name || undefined}
            durationFallback={conversation.duration}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DetailSection>
              <SectionHeader icon={Persons} title="Participants" />
              <div className="flex flex-col gap-3 text-[13px]">
                <div>
                  <div className="mb-0.5 text-muted">Client</div>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    {conversation.client_phone ? (
                      <>
                        <Handset className="size-3.5 shrink-0" aria-hidden="true" />
                        {formatPhoneForDisplay(conversation.client_phone)}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 text-muted">Operator</div>
                  <div className="font-medium text-foreground">{conversation.operator_name || "Unknown"}</div>
                </div>
              </div>
            </DetailSection>

            <DetailSection>
              <SectionHeader icon={Clock} title="Timing" />
              <div className="flex flex-col gap-3 text-[13px]">
                <div>
                  <div className="mb-0.5 text-muted">When</div>
                  <div className="font-medium text-foreground">{formatConversationTime(conversation)}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-muted">Duration</div>
                  <div className="font-medium text-foreground">{conversation.duration || "—"}</div>
                </div>
                {conversation.audio_file_size ? (
                  <div>
                    <div className="mb-0.5 text-muted">Audio size</div>
                    <div className="font-medium text-foreground">{formatBytes(conversation.audio_file_size)}</div>
                  </div>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection>
              <SectionHeader icon={Star} title="Scoring" />
              <div className="flex flex-col gap-3 text-[13px]">
                <div>
                  <div className="mb-0.5 text-muted">AI score</div>
                  <div className="font-semibold text-foreground">
                    {conversation.ai_score != null ? `${conversation.ai_score}/100` : "—"}
                  </div>
                </div>
                {conversation.sentiment ? (
                  <div>
                    <div className="mb-0.5 text-muted">Sentiment</div>
                    <div className="font-medium capitalize text-foreground">{conversation.sentiment}</div>
                  </div>
                ) : null}
                {conversation.disposition ? (
                  <div>
                    <div className="mb-0.5 text-muted">Disposition</div>
                    <div className="font-medium text-foreground">{conversation.disposition}</div>
                  </div>
                ) : null}
              </div>
            </DetailSection>
          </div>

          {conversation.summary ? (
            <DetailSection>
              <SectionHeader icon={FileText} title="Summary" />
              <p className="text-[14px] leading-[22px] text-foreground">{conversation.summary}</p>
            </DetailSection>
          ) : null}

          {evaluationEntries.length > 0 ? (
            <DetailSection>
              <SectionHeader icon={Star} title="Evaluation breakdown" />
              <div className="flex flex-col gap-3">
                {evaluationEntries.map((entry, i) => (
                  <div key={`${entry.name}-${i}`} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium capitalize text-foreground">{entry.name}</span>
                      {entry.score != null ? (
                        <span className="text-[12px] font-semibold text-foreground">{entry.score}</span>
                      ) : null}
                    </div>
                    {entry.feedback ? (
                      <p className="text-[12px] leading-[18px] text-muted">{entry.feedback}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(conversation.key_points ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={Flag} title="Key points" />
                <ul className="flex flex-col gap-2">
                  {(conversation.key_points ?? []).map((kp, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-[20px] text-foreground">
                      <span className="mt-[2px] shrink-0 text-success">●</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {(conversation.topics ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={FileText} title="Topics" />
                <div className="flex flex-wrap gap-2">
                  {(conversation.topics ?? []).map((topic, i) => (
                    <span
                      key={i}
                      className="inline-flex h-7 items-center rounded-full bg-[var(--default)] px-3 text-[12px] font-medium text-foreground"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </DetailSection>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(conversation.strengths ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={CircleCheck} title="Strengths" tone="success" />
                <ul className="flex flex-col gap-2">
                  {(conversation.strengths ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-[20px] text-foreground">
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {(conversation.improvements ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={Bulb} title="Improvements" tone="warning" />
                <ul className="flex flex-col gap-2">
                  {(conversation.improvements ?? []).map((im, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-[20px] text-foreground">
                      <Bulb className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                      <span>{im}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(conversation.follow_up_actions ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={Flag} title="Follow-up actions" />
                <ul className="flex flex-col gap-2">
                  {(conversation.follow_up_actions ?? []).map((a, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-[20px] text-foreground">
                      <Flag className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {(conversation.compliance_flags ?? []).length > 0 ? (
              <DetailSection>
                <SectionHeader icon={CircleExclamation} title="Compliance flags" tone="danger" />
                <ul className="flex flex-col gap-2">
                  {(conversation.compliance_flags ?? []).map((f, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-[20px] text-danger">
                      <CircleExclamation className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}
          </div>

          <TranscriptSection conversation={conversation} displayName={displayName} />
        </div>
      </div>

      {showAi ? (
        <ConversationAssistantDialog
          conversation={conversation}
          workspaceId={workspaceId}
          onClose={() => setShowAi(false)}
        />
      ) : null}

      {showLinkDialog ? (
        <LinkLeadDialog
          conversationId={conversation.id}
          currentLeadId={getLinkedLeadId(conversation.entities)}
          onClose={() => setShowLinkDialog(false)}
        />
      ) : null}
    </div>
  );
}

function TranscriptSection({ conversation, displayName }: { conversation: Conversation; displayName: string }) {
  const parsed = parseTranscript(conversation.transcript);
  if (parsed.kind === "empty") return null;

  return (
    <DetailSection>
      <SectionHeader icon={FileText} title="Transcript" />
      <div className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
        {parsed.kind === "raw" ? (
          <pre className="whitespace-pre-wrap text-[13px] leading-[20px] text-foreground">{parsed.text}</pre>
        ) : (
          parsed.turns.map((turn, i) => {
            const isLeft = turn.side === "operator";
            const speakerLabel = isLeft ? conversation.operator_name || "Operator" : displayName;
            return (
              <div key={i} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 ${
                    isLeft
                      ? "rounded-bl-md border border-divider bg-background text-foreground"
                      : "rounded-br-md bg-accent text-accent-foreground"
                  }`}
                >
                  <div className="mb-0.5 text-[11px] opacity-70">
                    {speakerLabel}
                    {turn.timestamp ? <span className="ml-2">{turn.timestamp}</span> : null}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-[20px]">{turn.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DetailSection>
  );
}

export function ConversationDetailPanel({ conversationId, onBack }: ConversationDetailPanelProps) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const query = useConversationQuery(conversationId);

  if (!conversationId) return <EmptyDetail />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onBack ? (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-divider bg-background px-4 md:hidden">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[14px] font-medium text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
        </div>
      ) : null}

      {query.isLoading ? (
        <LoadingState label="Loading conversation…" className="flex-1" />
      ) : query.isError ? (
        <div className="flex-1">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : query.data ? (
        <DetailBody conversation={query.data} workspaceId={workspaceId} />
      ) : (
        <EmptyDetail />
      )}
    </div>
  );
}

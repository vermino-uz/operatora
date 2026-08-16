"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Link as LinkIcon, Xmark } from "@gravity-ui/icons";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useConversationQuery } from "@/features/conversations/hooks/useConversationQuery";
import { useSessionStore } from "@/state/session-store";
import { ConversationAudioPlayer } from "@/features/conversations/components/ConversationAudioPlayer";
import { ConversationAssistantPanel } from "@/features/conversations/components/ConversationAssistantPanel";
import { LinkLeadDialog } from "@/features/conversations/components/LinkLeadDialog";
import { getLinkedLeadId } from "@/services/api/leadConversationLinks";
import { leadSearchApi } from "@/services/api/leadSearch";
import {
  parseEvaluationCriteria,
  parseTranscript,
  type Conversation,
} from "@/features/conversations/types";

export interface ConversationDetailPanelProps {
  conversationId: string;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">None</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Chip key={`${item}-${i}`} size="sm" variant="soft">
          {item}
        </Chip>
      ))}
    </div>
  );
}

function Transcript({ transcript }: { transcript: unknown }) {
  const parsed = parseTranscript(transcript);

  if (parsed.kind === "empty") {
    return <p className="text-sm text-muted">No transcript available.</p>;
  }

  if (parsed.kind === "raw") {
    return <pre className="whitespace-pre-wrap rounded-xl bg-[var(--default)] p-3 text-xs text-foreground">{parsed.text}</pre>;
  }

  return (
    <div className="flex flex-col gap-2">
      {parsed.turns.map((turn, i) => (
        <div
          key={i}
          className={`flex flex-col gap-0.5 rounded-2xl px-3 py-2 text-sm ${
            turn.side === "operator"
              ? "self-start bg-[var(--default)] text-foreground"
              : "self-end bg-accent/10 text-foreground"
          } max-w-[85%]`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <span>{turn.speaker}</span>
            {turn.timestamp ? <span>{turn.timestamp}</span> : null}
          </div>
          <p className="whitespace-pre-wrap">{turn.text}</p>
        </div>
      ))}
    </div>
  );
}

function EvaluationCriteria({ raw }: { raw: unknown }) {
  const entries = parseEvaluationCriteria(raw);
  if (entries.length === 0) return <p className="text-sm text-muted">No evaluation criteria recorded.</p>;
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <div key={`${entry.name}-${i}`} className="rounded-xl bg-[var(--default)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{entry.name}</span>
            {entry.score !== undefined ? (
              <span className="text-sm font-semibold text-foreground">{entry.score}</span>
            ) : null}
          </div>
          {entry.feedback ? <p className="mt-1 text-xs text-muted">{entry.feedback}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Currently-linked-lead chip (or a "Link lead" button when none is
 * linked) — Phase 2c-12. `conversation.entities` is already present on the
 * detail row (no extra fetch); the lead's display name is resolved via the
 * real `lead-search` by-ids endpoint (same one `LinkLeadDialog` uses). */
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
      <Button size="sm" variant="secondary" onPress={onOpenDialog}>
        <LinkIcon className="size-3.5" aria-hidden="true" />
        Link lead
      </Button>
    );
  }

  return (
    <Chip size="sm" variant="soft" color="accent" className="cursor-pointer" onClick={onOpenDialog}>
      Lead: {leadQuery.data?.[0]?.name ?? "…"}
    </Chip>
  );
}

function DetailContent({ conversation, workspaceId }: { conversation: Conversation; workspaceId: string | null }) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <LinkedLeadChip conversation={conversation} onOpenDialog={() => setShowLinkDialog(true)} />
          {conversation.status ? <Chip size="sm">{conversation.status}</Chip> : null}
          {conversation.sentiment ? (
            <Chip size="sm" variant="soft" className="capitalize">
              {conversation.sentiment}
            </Chip>
          ) : null}
          {conversation.source ? (
            <Chip size="sm" variant="soft" className="capitalize">
              {conversation.source}
            </Chip>
          ) : null}
          {conversation.ai_score !== null && conversation.ai_score !== undefined ? (
            <Chip size="sm" color={conversation.ai_score >= 80 ? "success" : conversation.ai_score >= 50 ? "warning" : "danger"}>
              Score {conversation.ai_score}
            </Chip>
          ) : null}
        </div>

        <Section title="Audio">
          <ConversationAudioPlayer conversationId={conversation.id} hasAudio={Boolean(conversation.audio_file_path)} />
        </Section>

        {conversation.summary ? (
          <Section title="Summary">
            <p className="text-sm text-foreground">{conversation.summary}</p>
          </Section>
        ) : null}

        <Section title="Key points">
          <TagList items={conversation.key_points} />
        </Section>

        <Section title="Topics">
          <TagList items={conversation.topics} />
        </Section>

        {conversation.disposition ? (
          <Section title="Disposition">
            <p className="text-sm text-foreground">{conversation.disposition}</p>
          </Section>
        ) : null}

        <Section title="Compliance flags">
          <TagList items={conversation.compliance_flags} />
        </Section>

        <Section title="Follow-up actions">
          <TagList items={conversation.follow_up_actions} />
        </Section>

        <Section title="Strengths">
          <TagList items={conversation.strengths} />
        </Section>

        <Section title="Improvements">
          <TagList items={conversation.improvements} />
        </Section>

        <Section title="Evaluation criteria">
          <EvaluationCriteria raw={conversation.evaluation_criteria} />
        </Section>

        <Section title="Transcript">
          <Transcript transcript={conversation.transcript} />
        </Section>
      </div>

      <div className="min-h-0 xl:sticky xl:top-0">
        <ConversationAssistantPanel conversation={conversation} workspaceId={workspaceId} />
      </div>

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

/** Detail view (right-hand panel): header info, summary, key points,
 * topics, compliance flags, disposition, follow-up actions, evaluation
 * criteria, strengths/improvements, turn-by-turn transcript, audio
 * player, and the "ask about this conversation" AI assistant. */
export function ConversationDetailPanel({ conversationId, onClose }: ConversationDetailPanelProps) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const query = useConversationQuery(conversationId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-divider px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {query.data?.client_name || "Conversation"}
          </p>
          <p className="truncate text-sm text-muted">
            {query.data?.operator_name ? `Operator: ${query.data.operator_name}` : ""}
            {query.data?.conversation_date ? ` · ${query.data.conversation_date} ${query.data.conversation_time ?? ""}` : ""}
            {query.data?.duration ? ` · ${query.data.duration}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted hover:bg-[var(--default)] hover:text-foreground"
        >
          <Xmark className="size-4" aria-hidden="true" />
        </button>
      </header>

      {query.isLoading ? (
        <LoadingState label="Loading conversation…" className="flex-1" />
      ) : query.isError ? (
        <div className="flex-1">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : query.data ? (
        <DetailContent conversation={query.data} workspaceId={workspaceId} />
      ) : null}
    </div>
  );
}

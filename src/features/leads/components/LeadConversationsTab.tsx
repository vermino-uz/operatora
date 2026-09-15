"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { CirclePlayFill, Pause } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useLeadConversationLinkMutations,
  useLeadLinkedConversationsQuery,
} from "@/features/leads/hooks/useLeadConversationLinks";
import { leadConversationLinksApi } from "@/services/api/leadConversationLinks";
import type { LeadLinkedConversation } from "@/features/leads/types";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { ConversationDetailPanel } from "@/features/conversations/components/ConversationDetailPanel";
import { useGlobalAudio } from "@/features/audio/GlobalAudioProvider";

/** Conversations linked to this lead via `conversations.entities`. Clicking a
 * row opens the full conversation detail (audio + transcript + AI analysis)
 * inline in this tab — same pattern as the old `LeadDetailsDialog` opening
 * `ConversationDetailsDialog`, not a redirect to `/conversations`. */
export function LeadConversationsTab({ leadId, isActive }: { leadId: string; isActive: boolean }) {
  const linkedQuery = useLeadLinkedConversationsQuery(leadId, isActive);
  const { link, unlink } = useLeadConversationLinkMutations(leadId);
  const globalAudio = useGlobalAudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LeadLinkedConversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(q: string) {
    setSearch(q);
    setIsSearching(true);
    setError(null);
    try {
      const rows = await leadConversationLinksApi.searchUnlinked(leadId, q);
      setResults(rows);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleLink(conversationId: string) {
    setError(null);
    try {
      await link.mutateAsync(conversationId);
      setResults((prev) => prev.filter((r) => r.id !== conversationId));
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handlePlay(e: React.MouseEvent, conv: LeadLinkedConversation) {
    e.stopPropagation();
    if (!conv.audio_file_path) return;
    const isThis = globalAudio.conversationId === conv.id;
    if (isThis && globalAudio.isPlaying) {
      globalAudio.pause();
      return;
    }
    if (isThis && !globalAudio.isPlaying) {
      globalAudio.resume();
      return;
    }
    try {
      await globalAudio.playConversation(conv.id, {
        title: conv.client_name || conv.client_phone || "Conversation",
        subtitle: conv.operator_name || undefined,
      });
    } catch {
      setError("Couldn't play this recording.");
    }
  }

  if (selectedId) {
    return (
      <div className="-mx-1 min-h-[28rem]">
        <ConversationDetailPanel conversationId={selectedId} onBack={() => setSelectedId(null)} forceBack />
      </div>
    );
  }

  if (linkedQuery.isLoading) return <LoadingState label="Loading conversations…" />;
  if (linkedQuery.isError) return <ErrorState error={linkedQuery.error} onRetry={() => linkedQuery.refetch()} />;
  const linked = linkedQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-foreground/50">
          Linked conversations ({linked.length}) — open one to play the recording here.
        </p>
        <Button size="sm" variant="secondary" onPress={() => setShowPicker((v) => !v)}>
          {showPicker ? "Close" : "Link a conversation"}
        </Button>
      </div>

      {showPicker ? (
        <div className="rounded-lg border border-border p-3">
          <TextField value={search} onChange={(v) => runSearch(v)}>
            <Label>Search recent conversations by name or phone</Label>
            <Input placeholder="e.g. Ali Valiyev" />
          </TextField>
          {isSearching ? <LoadingState label="Searching…" className="py-4" /> : null}
          <ul className="mt-2 flex flex-col gap-1">
            {results.map((conv) => (
              <li key={conv.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                <span>
                  {conv.client_name || conv.client_phone || "Unknown"} · {conv.conversation_date}{" "}
                  {conv.conversation_time}
                </span>
                <Button size="sm" variant="secondary" isDisabled={link.isPending} onPress={() => handleLink(conv.id)}>
                  Link
                </Button>
              </li>
            ))}
            {!isSearching && results.length === 0 ? (
              <li className="px-2 py-1 text-sm text-foreground/50">No matches in the recent conversation list.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {linked.length === 0 ? <EmptyState title="No linked conversations" /> : null}

      <ul className="flex flex-col gap-2">
        {linked.map((conv) => {
          const isThis = globalAudio.conversationId === conv.id;
          const isPlaying = isThis && globalAudio.isPlaying;
          return (
            <li key={conv.id}>
              <div className="flex items-start gap-2 rounded-lg border border-border p-3 transition-colors hover:border-foreground/20">
                <button
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium text-foreground">
                    {conv.client_name || conv.client_phone || "Unknown"}
                    {conv.operator_name ? (
                      <span className="font-normal text-foreground/50"> · {conv.operator_name}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {conv.conversation_date} {conv.conversation_time}
                    {conv.duration ? ` · ${conv.duration}` : ""}
                    {conv.status ? ` · ${conv.status}` : ""}
                    {conv.ai_score != null ? ` · score ${conv.ai_score}` : ""}
                  </p>
                  {conv.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/60">{conv.summary}</p>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  {conv.audio_file_path ? (
                    <button
                      type="button"
                      aria-label={isPlaying ? "Pause recording" : "Play recording"}
                      onClick={(e) => void handlePlay(e, conv)}
                      className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground/70 transition-colors hover:bg-[var(--default)] hover:text-foreground"
                    >
                      {isPlaying ? (
                        <Pause className="size-3.5" aria-hidden="true" />
                      ) : (
                        <CirclePlayFill className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                  <Button size="sm" variant="ghost" isDisabled={unlink.isPending} onPress={() => unlink.mutate(conv.id)}>
                    Unlink
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

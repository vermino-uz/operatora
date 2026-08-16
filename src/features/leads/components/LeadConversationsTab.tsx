"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";

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

/** Conversations linked to this lead via `conversations.entities`; see
 * `services/api/leadConversationLinks.ts`'s doc comment for the bounded
 * recent-scan tradeoff. No per-conversation deep link exists in this app
 * yet (`/conversations` has no id-addressable detail route — confirmed by
 * reading `app/(protected)/conversations/page.tsx`, the detail panel is
 * pure client state, not a route), so this links to the list page only,
 * matching what's actually reachable rather than fabricating a URL. */
export function LeadConversationsTab({ leadId, isActive }: { leadId: string; isActive: boolean }) {
  const linkedQuery = useLeadLinkedConversationsQuery(leadId, isActive);
  const { link, unlink } = useLeadConversationLinkMutations(leadId);
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

  if (linkedQuery.isLoading) return <LoadingState label="Loading conversations…" />;
  if (linkedQuery.isError) return <ErrorState error={linkedQuery.error} onRetry={() => linkedQuery.refetch()} />;
  const linked = linkedQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground/50">
          Conversations linked to this lead ({linked.length}) — scanned from the most recent 300 workspace-wide.
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
                  {conv.client_name || conv.client_phone || "Unknown"} · {conv.conversation_date} {conv.conversation_time}
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
        {linked.map((conv) => (
          <li key={conv.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-medium text-foreground">{conv.client_name || conv.client_phone || "Unknown"}</p>
              <p className="text-xs text-foreground/50">
                {conv.conversation_date} {conv.conversation_time}
                {conv.status ? ` · ${conv.status}` : ""}
                {conv.ai_score != null ? ` · score ${conv.ai_score}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/conversations" className="text-xs text-primary underline">
                Open list
              </a>
              <Button size="sm" variant="ghost" isDisabled={unlink.isPending} onPress={() => unlink.mutate(conv.id)}>
                Unlink
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Gear } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConversationsQuery } from "@/features/conversations/hooks/useConversationsQuery";
import { ConversationFilters } from "@/features/conversations/components/ConversationFilters";
import { ConversationsTable } from "@/features/conversations/components/ConversationsTable";
import { ConversationDetailPanel } from "@/features/conversations/components/ConversationDetailPanel";
import { ConversationsSettingsDialog } from "@/features/conversations/components/ConversationsSettingsDialog";
import type { Conversation, ConversationListFilters } from "@/features/conversations/types";

const PAGE_SIZE = 50;

/**
 * Conversations — read-only first pass (see PROGRESS.md Phase 2b for the
 * full scope boundary: no review/scoring, no link-operator/lead, no
 * delete, no "trigger processing", no realtime, no processing-queue
 * monitor — none of that exists as a working backend endpoint yet).
 *
 * Layout: list (filters + `ConversationsTable`, server-driven pagination
 * via `offset`/`limit`) on the left, selected-conversation detail in a
 * side panel on the right — same "list + local selection state" shape the
 * AI Chat page (`/dashboard`) already established for its thread list,
 * not a separate route (URL doesn't carry the selected id — consistent
 * with that precedent, and there's no deep-link requirement in the
 * brief).
 */
export default function ConversationsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [filters, setFilters] = useState<ConversationListFilters>({});
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const params = useMemo(
    () => ({ ...filters, offset, limit: PAGE_SIZE }),
    [filters, offset],
  );

  const query = useConversationsQuery(workspaceId, params);

  // Every filters/status/operator option offered is server-supported (see
  // ConversationFilters) — operators/statuses lists are derived from the
  // current page's data as a lightweight discovery aid, not a separate
  // lookup endpoint (none exists).
  const operators = useMemo(() => {
    const set = new Set<string>();
    for (const c of query.data?.items ?? []) if (c.operator_name) set.add(c.operator_name);
    return Array.from(set).sort();
  }, [query.data]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const c of query.data?.items ?? []) if (c.status) set.add(c.status);
    return Array.from(set).sort();
  }, [query.data]);

  const handleFiltersChange = (next: ConversationListFilters) => {
    setFilters(next);
    setOffset(0);
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="No workspace selected"
          description="Sign in to a workspace to view conversations."
        />
      </div>
    );
  }

  return (
    <div className="-m-3 flex h-[calc(100%+1.5rem)] min-h-0 md:-m-6 md:h-[calc(100%+3rem)]">
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${selected ? "hidden md:flex" : ""}`}>
        <div className="flex flex-col gap-2 border-b border-divider px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            <h1 className="text-base font-semibold text-foreground">Conversations</h1>
            <p className="text-sm text-foreground/60">Call recordings, AI summaries, and lead updates.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            aria-label="Conversation settings"
            onPress={() => setSettingsOpen(true)}
            className="self-start sm:self-auto"
          >
            <Gear className="size-4" aria-hidden="true" />
            Settings
          </Button>
        </div>
        <ConversationFilters filters={filters} onChange={handleFiltersChange} operators={operators} statuses={statuses} />
        <ConversationsTable
          query={query}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          offset={offset}
          limit={PAGE_SIZE}
          onOffsetChange={setOffset}
        />
      </div>

      {selected ? (
        <div className="flex min-h-0 w-full shrink-0 flex-col border-l border-divider bg-background md:w-[min(100%,720px)] lg:w-[720px]">
          <ConversationDetailPanel key={selected.id} conversationId={selected.id} onClose={() => setSelected(null)} />
        </div>
      ) : null}

      {settingsOpen && workspaceId ? (
        <ConversationsSettingsDialog workspaceId={workspaceId} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}

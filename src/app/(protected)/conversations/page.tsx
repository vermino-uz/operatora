"use client";

import { useEffect, useMemo, useState } from "react";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConversationsQuery } from "@/features/conversations/hooks/useConversationsQuery";
import { ConversationToolbar } from "@/features/conversations/components/ConversationToolbar";
import { ConversationsList } from "@/features/conversations/components/ConversationsList";
import { ConversationDetailPanel } from "@/features/conversations/components/ConversationDetailPanel";
import { ConversationsSettingsDialog } from "@/features/conversations/components/ConversationsSettingsDialog";
import type { ConversationListFilters } from "@/features/conversations/types";

const PAGE_SIZE = 50;

type ViewMode = "calls" | "meetRecordings";

/**
 * Conversations — master/detail split matching the old frontend layout:
 * toolbar filters + status pills, list aside on the left, rich detail on
 * the right (AI opens in a dialog, not a permanent side column).
 */
export default function ConversationsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [viewMode, setViewMode] = useState<ViewMode>("calls");
  const [filters, setFilters] = useState<ConversationListFilters>({});
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const params = useMemo(
    () => ({ ...filters, offset, limit: PAGE_SIZE }),
    [filters, offset],
  );

  const query = useConversationsQuery(workspaceId, params);
  const totalCount = query.data?.total ?? 0;
  const items = query.data?.items ?? [];

  const operators = useMemo(() => {
    const set = new Set<string>();
    for (const c of items) if (c.operator_name) set.add(c.operator_name);
    return Array.from(set).sort();
  }, [items]);

  const handleFiltersChange = (next: ConversationListFilters) => {
    setFilters(next);
    setOffset(0);
  };

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId("");
      return;
    }
    if (!items.some((c) => c.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

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
    <div className="-m-3 flex h-[calc(100%+1.5rem)] min-h-0 w-[calc(100%+1.5rem)] flex-col md:-m-6 md:h-[calc(100%+3rem)] md:w-[calc(100%+3rem)]">
      <ConversationToolbar
        filters={filters}
        onChange={handleFiltersChange}
        operators={operators}
        totalCount={totalCount}
        onOpenSettings={() => setSettingsOpen(true)}
        className={mobileShowDetail ? "hidden md:flex" : undefined}
      />

      <div className={`flex shrink-0 border-b border-divider px-4 md:px-5 ${mobileShowDetail ? "hidden md:flex" : ""}`}>
        <ViewTab active={viewMode === "calls"} onClick={() => setViewMode("calls")} label="Calls" />
        <ViewTab
          active={viewMode === "meetRecordings"}
          onClick={() => setViewMode("meetRecordings")}
          label="Meet Recordings"
        />
      </div>

      <div className="relative flex min-h-0 flex-1">
        {viewMode === "meetRecordings" ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="Meet recordings"
              description="Google Meet recording import is coming soon. Use the Calls tab for phone conversations."
            />
          </div>
        ) : (
          <>
            <aside
              className={`flex min-h-0 w-full shrink-0 flex-col border-r border-divider bg-background md:w-[380px] ${
                mobileShowDetail ? "hidden md:flex" : "flex"
              }`}
            >
              <ConversationsList
                query={query}
                selectedId={selectedId || null}
                onSelect={(c) => {
                  setSelectedId(c.id);
                  setMobileShowDetail(true);
                }}
                offset={offset}
                limit={PAGE_SIZE}
                onOffsetChange={setOffset}
              />
            </aside>

            <main
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-background ${
                mobileShowDetail ? "absolute inset-0 z-10 flex md:static" : "hidden md:flex"
              }`}
            >
              <ConversationDetailPanel
                key={selectedId}
                conversationId={selectedId}
                onBack={mobileShowDetail ? () => setMobileShowDetail(false) : undefined}
              />
            </main>
          </>
        )}
      </div>

      {settingsOpen ? (
        <ConversationsSettingsDialog workspaceId={workspaceId} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}

function ViewTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-accent text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

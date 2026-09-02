"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConversationListItem } from "@/features/conversations/components/ConversationListItem";
import type { Conversation } from "@/features/conversations/types";
import type { Paginated } from "@/types/api";
import type { UseQueryResult } from "@tanstack/react-query";

export interface ConversationsListProps {
  query: UseQueryResult<Paginated<Conversation>>;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  offset: number;
  limit: number;
  onOffsetChange: (offset: number) => void;
}

export function ConversationsList({
  query,
  selectedId,
  onSelect,
  offset,
  limit,
  onOffsetChange,
}: ConversationsListProps) {
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-divider bg-[var(--default)] px-4">
        <span className="text-[13px] font-medium text-foreground/70">Newest first</span>
        <span className="text-[12px] text-muted">
          {query.isLoading ? "Loading…" : `Showing ${items.length} of ${total.toLocaleString()}`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading && items.length === 0 ? (
          <LoadingState label="Loading conversations…" className="py-16" />
        ) : query.isError ? (
          <div className="p-4">
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-[13px] text-muted">
            <EmptyState
              title="No conversations found"
              description="Try adjusting your filters or search terms."
            />
          </div>
        ) : (
          items.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              active={selectedId === conversation.id}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>

      {total > limit ? (
        <div className="flex h-12 shrink-0 items-center justify-between border-t border-divider px-4">
          <button
            type="button"
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            disabled={page <= 1 || query.isLoading}
            className="text-[12px] font-medium text-foreground/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[12px] text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onOffsetChange(offset + limit)}
            disabled={page >= totalPages || query.isLoading}
            className="text-[12px] font-medium text-foreground/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, Input, Tooltip } from "@heroui/react";
import { Comment as MessageSquare, Plus, Magnifier as Search, TrashBin as Trash2 } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { useThreadMutations } from "@/features/chat/hooks/useThreadMutations";
import type { ChatThread } from "@/features/chat/types";

export interface ChatThreadListProps {
  workspaceId: string | null;
  threadsQuery: UseQueryResult<ChatThread[]>;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onNewThread: () => void;
  className?: string;
}

/** The chat feature's own thread-history sidebar — a second column inside
 * the dashboard page, separate from the app-wide icon-rail `AppSidebar`.
 * Visually mirrors the HeroUI Pro template's `chat-sidebar.tsx` (a
 * `Sidebar.Menu` of icon + truncated-title rows under a "Recent" group
 * label, hover-revealed row actions) — spacing/tokens taken from the Pro
 * package's own `sidebar` BEM CSS (`--default`/`--muted` tokens,
 * `rounded-2xl` item content, `min-h-9` rows) since the compound `Sidebar`
 * component itself isn't usable at runtime here (no Pro license — see
 * PROGRESS.md), only its OSS-buildable visual spec. */
export function ChatThreadList({
  workspaceId,
  threadsQuery,
  threads,
  activeThreadId,
  onSelect,
  onNewThread,
  className,
}: ChatThreadListProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const { deleteThread } = useThreadMutations(workspaceId);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, debouncedSearch]);

  return (
    <aside
      className={`h-full shrink-0 flex-col bg-background shadow-[inset_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)] ${className ?? "flex w-full md:w-60"}`}
    >
      <div className="flex flex-col gap-2 px-4 pb-2 pt-4">
        <Button size="sm" fullWidth onPress={onNewThread} data-testid="chat-new-thread">
          <Plus className="size-4" aria-hidden="true" />
          New chat
        </Button>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            aria-label="Search chats"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="pl-8"
            fullWidth
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
        {threadsQuery.isLoading ? (
          <LoadingState label="Loading chats…" />
        ) : threadsQuery.isError ? (
          <ErrorState error={threadsQuery.error} onRetry={() => threadsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={threads.length === 0 ? "No chats yet" : "No matches"}
            description={
              threads.length === 0
                ? "Start a new conversation to see it here."
                : "Try a different search term."
            }
          />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="select-none truncate px-2 py-1.5 text-xs font-medium text-muted">
              Recent
            </span>
            <ul className="flex flex-col gap-0.5" aria-label="Chat threads">
              {filtered.map((thread) => {
                const isActive = thread.id === activeThreadId;
                return (
                  <li key={thread.id} className="group relative flex w-full">
                    <button
                      type="button"
                      onClick={() => onSelect(thread.id)}
                      data-testid={`chat-thread-${thread.id}`}
                      className={`flex min-h-9 w-full min-w-0 items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors ${
                        isActive ? "bg-[var(--default)]" : "hover:bg-[var(--default)]"
                      }`}
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center ${
                          isActive ? "text-foreground" : "text-muted"
                        }`}
                      >
                        <MessageSquare className="size-4" aria-hidden="true" />
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate pr-6 text-sm text-foreground ${
                          isActive ? "font-medium" : ""
                        }`}
                      >
                        {thread.title || "Untitled chat"}
                      </span>
                    </button>
                    <Tooltip delay={300}>
                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${thread.title || "this chat"}"?`)) {
                            deleteThread.mutate(thread.id, {
                              onSuccess: () => {
                                if (activeThreadId === thread.id) onNewThread();
                              },
                            });
                          }
                        }}
                        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-danger/10 hover:text-danger group-hover:flex"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                      <Tooltip.Content placement="right">Delete chat</Tooltip.Content>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

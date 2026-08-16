"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { subscribeToChatThreadUpdates } from "@/services/realtime/subscriptions";
import { useChatController } from "@/features/chat/hooks/useChatController";
import { useModelsQuery } from "@/features/chat/hooks/useModelsQuery";
import { ChatThreadList } from "@/features/chat/components/ChatThreadList";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { MessageList } from "@/features/chat/components/MessageList";
import { ChatComposer } from "@/features/chat/components/ChatComposer";

/**
 * AI Chat — the default/first sidebar item, backed by the real
 * `/ai-chat/*` endpoints (threads CRUD + SSE streaming + runs). See
 * PROGRESS.md Phase 2b for exactly what's real-backend-wired here vs.
 * deliberately deferred (card kinds without a traced write endpoint,
 * generated-media/Higgsfield job flows, etc).
 *
 * Layout: `AppShell`/`AppSidebar` (icon-rail) own the app-wide chrome; this
 * page renders a second, feature-local column (chat thread history) plus
 * the message thread + composer, adapted from the HeroUI Pro template's
 * `chat-sidebar`/`chat-navbar`/`chat-composer` composition pattern — not
 * wrapped in the template's own `AppLayout` (that would compete with the
 * project's `AppShell`).
 */
export default function DashboardPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const queryClient = useQueryClient();

  const controller = useChatController({ workspaceId });
  const modelsQuery = useModelsQuery(workspaceId);

  // Realtime: thread-list invalidation only — the chat stream itself never
  // arrives over the socket, only via the SSE endpoints (see
  // services/api/chat.ts). Re-subscribes whenever the active workspace
  // changes; unsubscribes on unmount so a stale listener doesn't keep
  // invalidating a query for a workspace the user has since left.
  useEffect(() => {
    if (!workspaceId) return;
    return subscribeToChatThreadUpdates(queryClient, workspaceId);
  }, [workspaceId, queryClient]);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="No workspace selected"
          description="Sign in to a workspace to start chatting with Operatora AI."
        />
      </div>
    );
  }

  const isInitialLoading = controller.threadsQuery.isLoading && controller.threads.length === 0;

  const activeModelOption = modelsQuery.data?.allowed.find((m) => m.id === controller.model);
  const headerTitle = controller.activeThread?.title || "New chat";
  const headerSubtitle = controller.activeThread
    ? `Updated ${new Date(controller.activeThread.updated_at).toLocaleString()}`
    : "Ask about leads, conversations, tasks, and more";

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] min-h-0">
      <ChatThreadList
        workspaceId={workspaceId}
        threadsQuery={controller.threadsQuery}
        threads={controller.threads}
        activeThreadId={controller.activeThreadId}
        onSelect={controller.selectThread}
        onNewThread={controller.startNewThread}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <ChatHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          modelLabel={activeModelOption?.label ?? activeModelOption?.name}
        />

        {isInitialLoading ? (
          <LoadingState label="Loading your chats…" className="flex-1" />
        ) : (
          <MessageList
            messages={controller.messages}
            streaming={controller.streaming}
            threadId={controller.activeThreadId}
            onSelectSuggestion={controller.send}
            isSending={controller.isSending}
          />
        )}

        <ChatComposer
          onSend={controller.send}
          onStop={controller.stop}
          isSending={controller.isSending}
          model={controller.model}
          onModelChange={controller.setModel}
          allowedModels={modelsQuery.data?.allowed}
        />
      </div>
    </div>
  );
}

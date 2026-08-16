import type { QueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket } from "@/services/realtime/socket";
import { chatThreadsQueryKey } from "@/features/chat/hooks/useThreadsQuery";
import { leadBoardQueryKey } from "@/features/leads/hooks/useLeadBoardQuery";

/**
 * First entry in what ARCHITECTURE.md calls `services/realtime/subscriptions.ts`
 * (topic subscribe/unsubscribe + event -> queryClient mapping table) — see
 * PROGRESS.md Phase 2b. Deliberately scoped to exactly one topic/table for
 * now (AI Chat's thread list), per the feature brief: the chat stream itself
 * is never delivered over the socket, only via the SSE endpoints in
 * `services/api/chat.ts`. The socket is used here purely as a "something
 * changed, go refetch" signal for the thread list (rename/new-thread-from-
 * elsewhere/delete), not as a source of truth applied directly to the cache.
 */

const INVALIDATE_DEBOUNCE_MS = 1200;
const THREADS_TABLE = "ai_dashboard_threads_v2";

interface RealtimeChannelPayload {
  event?: string;
  table?: string;
  new?: unknown;
  old?: unknown;
  topic?: string;
  [key: string]: unknown;
}

/**
 * Subscribes to `workspace:{workspaceId}` and debounces a thread-list
 * refetch whenever a payload for `ai_dashboard_threads_v2` arrives. Returns
 * an unsubscribe function — call it on workspace change/unmount so a stale
 * subscription doesn't keep invalidating a query for a workspace the user
 * has left.
 */
export function subscribeToChatThreadUpdates(
  queryClient: QueryClient,
  workspaceId: string,
): () => void {
  const socket = getSocket();
  connectSocket();

  const topic = `workspace:${workspaceId}`;
  const wireEvent = `channel:${topic}`;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleInvalidate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      queryClient.invalidateQueries({ queryKey: chatThreadsQueryKey(workspaceId) });
    }, INVALIDATE_DEBOUNCE_MS);
  };

  const handlePayload = (payload: RealtimeChannelPayload) => {
    if (payload?.table === THREADS_TABLE) scheduleInvalidate();
  };

  socket.emit("subscribe", { topic });
  socket.on(wireEvent, handlePayload);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    socket.off(wireEvent, handlePayload);
    socket.emit("unsubscribe", { topic });
  };
}

/**
 * Second realtime-subscriptions entry, alongside the chat-threads one
 * above. Subscribes to the same `workspace:{workspaceId}` topic and invokes
 * `onPresenceChanged` whenever a `presence_changed` event arrives — mirrors
 * the old frontend's `useWorkspacePresence` (`subscribeRealtime` + the
 * `presence_changed` event name), reusing this app's existing socket
 * infrastructure instead of standing up a second one. Returns an
 * unsubscribe function; callers must call it on unmount/workspace change.
 */
export function subscribeToWorkspacePresence(
  workspaceId: string,
  onPresenceChanged: (payload: { user_id?: string; online?: boolean; last_seen?: string | null }) => void,
): () => void {
  const socket = getSocket();
  connectSocket();

  const topic = `workspace:${workspaceId}`;
  const wireEvent = `channel:${topic}`;

  const handlePayload = (payload: RealtimeChannelPayload) => {
    if (payload?.event !== "presence_changed") return;
    const row = payload.new as Record<string, unknown> | undefined;
    if (!row) return;
    onPresenceChanged({
      user_id: typeof row.user_id === "string" ? row.user_id : undefined,
      online: typeof row.online === "boolean" ? row.online : undefined,
      last_seen: typeof row.last_seen === "string" ? row.last_seen : row.last_seen === null ? null : undefined,
    });
  };

  socket.emit("subscribe", { topic });
  socket.on(wireEvent, handlePayload);

  return () => {
    socket.off(wireEvent, handlePayload);
    socket.emit("unsubscribe", { topic });
  };
}

/**
 * Third realtime-subscriptions entry — Super Agent (Hermes) task list live
 * updates. Mirrors the old frontend's `SuperAgentPanel.tsx` (`subscribeRealtime`
 * on `super_agent_tasks`): subscribes to the same `workspace:{workspaceId}`
 * topic and debounce-invalidates the task-list query (plus the specific
 * task-detail query, if the payload names a row id) whenever a
 * `super_agent_tasks` row changes, so a running task's status/progress
 * updates without polling.
 */
export function subscribeToSuperAgentTasks(
  queryClient: QueryClient,
  workspaceId: string,
): () => void {
  const socket = getSocket();
  connectSocket();

  const topic = `workspace:${workspaceId}`;
  const wireEvent = `channel:${topic}`;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleInvalidate = (taskId: string | undefined) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void queryClient.invalidateQueries({ queryKey: ["super-agent-tasks", workspaceId] });
      if (taskId) {
        void queryClient.invalidateQueries({ queryKey: ["super-agent-task", workspaceId, taskId] });
      }
    }, INVALIDATE_DEBOUNCE_MS);
  };

  const handlePayload = (payload: RealtimeChannelPayload) => {
    if (payload?.table !== "super_agent_tasks") return;
    const row = payload.new as Record<string, unknown> | undefined;
    const id = typeof row?.id === "string" ? row.id : undefined;
    scheduleInvalidate(id);
  };

  socket.emit("subscribe", { topic });
  socket.on(wireEvent, handlePayload);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    socket.off(wireEvent, handlePayload);
    socket.emit("unsubscribe", { topic });
  };
}

/**
 * Fourth realtime-subscriptions entry — the Leads Kanban board. Subscribes
 * to the same `workspace:{workspaceId}` topic and debounce-invalidates the
 * board's `lead-board` (column counts) and every `column-leads` page for
 * `boardId` whenever a `lead_moved`/`lead_assigned`/`lead_deleted` event
 * arrives for the `leads` table — see `right-board-controller.service.ts`'s
 * `notifyLeadsChanged()`, which emits `{event, table:'leads', new:{leadIds,
 * ...extra}}` to every workspace touched by the affected leads. Like the
 * chat-threads subscription above, this is a "something changed, go
 * refetch" signal, not a source of truth applied directly to the cache —
 * the mutation hooks' own optimistic patches (`useLeadMutations.ts`) handle
 * the local actor's own moves without waiting on this round-trip; this
 * subscription is what keeps *other* operators' concurrent moves visible.
 */
const LEAD_BOARD_EVENTS = new Set(["lead_moved", "lead_assigned", "lead_deleted"]);

export function subscribeToLeadBoardUpdates(
  queryClient: QueryClient,
  workspaceId: string,
  boardId: string,
): () => void {
  const socket = getSocket();
  connectSocket();

  const topic = `workspace:${workspaceId}`;
  const wireEvent = `channel:${topic}`;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleInvalidate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      queryClient.invalidateQueries({ queryKey: leadBoardQueryKey(boardId) });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "column-leads" && q.queryKey[1] === boardId,
      });
    }, INVALIDATE_DEBOUNCE_MS);
  };

  const handlePayload = (payload: RealtimeChannelPayload) => {
    if (payload?.table !== "leads") return;
    if (typeof payload.event !== "string" || !LEAD_BOARD_EVENTS.has(payload.event)) return;
    scheduleInvalidate();
  };

  socket.emit("subscribe", { topic });
  socket.on(wireEvent, handlePayload);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    socket.off(wireEvent, handlePayload);
    socket.emit("unsubscribe", { topic });
  };
}

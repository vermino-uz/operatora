"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { createQueryClient } from "@/services/api/query-client";
import { registerForceLogoutHandler } from "@/services/api/client";
import { subscribeToUserNotifications } from "@/services/realtime/subscriptions";
import { useSessionStore } from "@/state/session-store";

/**
 * Wires the API client's forced-logout callback (401-refresh-failure /
 * SESSION_SUPERSEDED — see ARCHITECTURE.md Auth section) to the session
 * store + a redirect to /login. Lives inside the QueryClientProvider tree
 * so it can also clear the query cache.
 */
function ForceLogoutBridge() {
  const router = useRouter();
  const clear = useSessionStore((s) => s.clear);

  useEffect(() => {
    registerForceLogoutHandler(() => {
      clear();
      router.replace("/login");
    });
  }, [clear, router]);

  return null;
}

/**
 * Wires the personal `user_notifications:{userId}` realtime topic (Phase
 * 2k — see `services/realtime/subscriptions.ts#subscribeToUserNotifications`
 * for the full event catalog/rationale) as soon as the session resolves a
 * user id, and tears it down on logout/user change — same lifecycle
 * pattern as the per-workspace subscriptions elsewhere in this repo, just
 * mounted globally since notifications aren't scoped to a single page.
 * Lives inside the QueryClientProvider tree so it can invalidate queries.
 *
 * Phase 2m: `onMention` (`team_chat_mention`) — checked `features/messages`/
 * `features/chat`/`features/team` directly and there's no @mention concept
 * in the Team Chat UI to feed (`TeamChatPanel.tsx` renders plain rows, no
 * parsing/highlighting) and no toast infrastructure exists anywhere in this
 * repo to add one for. Per the feature brief, the correct minimal reaction
 * is *not* inventing either: `scheduleInvalidate()` inside
 * `subscribeToUserNotifications` already runs unconditionally for this
 * event (see that function), so the mention surfaces through the
 * Notifications bell (Phase 2m, `NotificationsBell.tsx`) like any other
 * notification with zero extra code. The one thing worth doing here is
 * keeping an already-open Team Chat panel live: nudge its feed query so the
 * mentioning message itself appears immediately rather than waiting on
 * `subscribeToTeamChatMessages`'s own 1200ms debounce window on the
 * separate `messages:{workspaceId}` topic.
 */
function UserNotificationsBridge() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const workspaceId = useSessionStore((s) => s.workspaceId);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToUserNotifications(queryClient, userId, {
      onMention: () => {
        if (!workspaceId) return;
        void queryClient.invalidateQueries({ queryKey: ["team-chat-feed", workspaceId] });
      },
    });
    return unsubscribe;
  }, [queryClient, userId, workspaceId]);

  return null;
}

/** Registers the installability-only service worker (public/sw.js — no
 * offline caching, see its own comment). Best-effort: browsers without
 * support just skip it, and a failed registration shouldn't ever affect
 * the app itself. */
function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — installability is a nice-to-have, never worth
      // surfacing an error for.
    });
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per mount (per browser tab), never module-scope — see
  // services/api/query-client.ts.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ForceLogoutBridge />
        <UserNotificationsBridge />
        <ServiceWorkerRegistration />
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

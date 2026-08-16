"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/types/api";
import { tokenStorage } from "@/services/api/token-storage";
import { useSessionStore } from "@/state/session-store";
import { useEffect } from "react";

/**
 * Bootstraps/refreshes the session from `/api/auth/me`. Short staleTime +
 * refetch-on-focus/reconnect per ARCHITECTURE.md's caching table — this is
 * what route guards key off of. Only runs when a token is present locally;
 * otherwise there is nothing to validate and the store is marked
 * unauthenticated immediately (no wasted request).
 */
export function useMe() {
  const setSession = useSessionStore((s) => s.setSession);
  const clear = useSessionStore((s) => s.clear);
  const setStatus = useSessionStore((s) => s.setStatus);
  const hasToken = typeof window !== "undefined" && Boolean(tokenStorage.getAccessToken());

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: hasToken,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // 401/403 mean "not authenticated" — never retry those; only retry
      // transient network/server errors, capped.
      if (error instanceof ApiError && (error.isAuthError || error.isForbidden)) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!hasToken) {
      clear();
      return;
    }
    if (query.data) {
      setSession({ user: query.data.user, roles: query.data.roles, workspaceId: query.data.workspaceId });
    } else if (query.isError) {
      clear();
    } else if (query.isLoading) {
      setStatus("loading");
    }
  }, [hasToken, query.data, query.isError, query.isLoading, setSession, clear, setStatus]);

  return query;
}

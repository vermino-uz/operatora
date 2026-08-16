import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/types/api";

/**
 * One QueryClient per browser tab (created lazily in `providers.tsx`, never
 * at module scope, so SSR doesn't leak state across requests). Defaults
 * implement the network-flood-prevention baseline from ARCHITECTURE.md:
 * capped retries with backoff, disabled on 4xx, mutations never auto-retry.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Client errors (validation, auth, forbidden, not-found) will
            // never succeed by retrying — only retry network/5xx failures.
            if (error.statusCode >= 400 && error.statusCode < 500) return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Old API's idempotency is inconsistent across endpoints (see
        // ARCHITECTURE.md) — never auto-retry a mutation by default; opt in
        // per-call only for known-idempotent operations.
        retry: false,
      },
    },
  });
}

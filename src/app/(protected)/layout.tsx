"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@/features/auth/hooks/useMe";
import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/constants/routes";

/**
 * Enforces auth for everything under this route group. `proxy.ts`
 * already redirects most unauthenticated visits before this ever renders
 * (fast path, cookie-hint based); this is the authoritative client-side
 * check — it actually calls `/api/auth/me` and only renders protected
 * content once that succeeds, so a stale/forged hint cookie can never grant
 * access to real data (the API call itself is what's gated by the real
 * Bearer token, and the backend re-validates it regardless).
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useSessionStore((s) => s.status);
  const { isLoading, isError, error, refetch } = useMe();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(ROUTES.login);
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  if (isLoading || status === "idle" || status === "loading") {
    return <LoadingState label="Loading your workspace…" className="min-h-screen" />;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

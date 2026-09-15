"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@/features/auth/hooks/useMe";
import { useSessionStore } from "@/state/session-store";

/**
 * Lightweight per-page auth guard for "auth-adjacent" pages that need a
 * signed-in user but deliberately don't want the full `(protected)` app
 * shell/sidebar — `/checkout` and `/welcome`, mirroring the old frontend's
 * own `Checkout.tsx`/`Welcome.tsx` (each wrapped only in `<AuthProvider>`,
 * never `<ProtectedRoute>`, and each redirecting to `/auth` itself once
 * `loading` resolves with no user). Not shared with `(protected)/layout.tsx`
 * on purpose — that one also mounts `AppShell`.
 */
export function useRequireAuth(redirectTo = "/login") {
  const router = useRouter();
  const status = useSessionStore((s) => s.status);
  const meQuery = useMe();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  return {
    isChecking: status === "idle" || status === "loading" || meQuery.isLoading,
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}

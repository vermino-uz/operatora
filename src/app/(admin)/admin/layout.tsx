"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@/features/auth/hooks/useMe";
import { useSessionStore } from "@/state/session-store";
import { isAdmin } from "@/auth/permissions";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Admin console — same auth guard as (protected), plus a global-role check
 * (see ARCHITECTURE.md Open Question #2: ships as a route group in this
 * app, mounted at /admin, rather than a separate deployable). Hidden UI is
 * a UX courtesy; the backend independently enforces `RolesGuard` on every
 * admin endpoint regardless of what renders here.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useSessionStore((s) => s.status);
  const roles = useSessionStore((s) => s.roles);
  useMe();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isAdmin(roles)) router.replace("/dashboard");
  }, [status, roles, router]);

  if (status !== "authenticated" || !isAdmin(roles)) {
    return <LoadingState label="Checking access…" className="min-h-screen" />;
  }

  return <AppShell>{children}</AppShell>;
}

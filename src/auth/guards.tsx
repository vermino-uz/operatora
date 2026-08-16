"use client";

import type { ReactNode } from "react";
import { useSessionStore } from "@/state/session-store";
import { hasAnyRole } from "@/auth/permissions";
import type { AppRole } from "@/types/entities";

/** Renders children only if the current session has one of `roles`.
 * Purely a UX/display gate — never the authorization boundary (the
 * backend re-checks every request regardless of what this hides). */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const currentRoles = useSessionStore((s) => s.roles);
  if (!hasAnyRole(currentRoles, roles)) return <>{fallback}</>;
  return <>{children}</>;
}

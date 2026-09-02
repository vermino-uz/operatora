import type { AccountType, AppRole, AuthMe, AuthUser } from "@/types/entities";

function readAccountType(raw: Record<string, unknown>): AccountType | null {
  const top = raw.account_type;
  if (top === "team" || top === "independent") return top;
  const profile = raw.profile;
  if (profile && typeof profile === "object") {
    const nested = (profile as Record<string, unknown>).account_type;
    if (nested === "team" || nested === "independent") return nested;
  }
  return null;
}

/** Maps `/auth/me`'s flat profile payload into the nested `AuthMe` shape. */
export function normalizeSessionUser(raw: Record<string, unknown>): AuthUser {
  const profile =
    raw.profile && typeof raw.profile === "object"
      ? (raw.profile as AuthUser["profile"])
      : null;

  return {
    ...raw,
    id: String(raw.id),
    email: (raw.email as string | null | undefined) ?? null,
    phone: (raw.phone as string | null | undefined) ?? null,
    full_name: profile?.full_name ?? (raw.full_name as string | null | undefined) ?? null,
    account_type: readAccountType(raw),
    profile,
  };
}

export function normalizeAuthMe(raw: Record<string, unknown>): AuthMe {
  if (raw.user && typeof raw.user === "object") {
    return {
      user: normalizeSessionUser(raw.user as Record<string, unknown>),
      roles: (raw.roles as AppRole[]) ?? [],
      workspaceId: raw.workspaceId as string | undefined,
    };
  }

  const { roles, workspaceId, ...userFields } = raw;
  return {
    user: normalizeSessionUser(userFields),
    roles: (roles as AppRole[]) ?? [],
    workspaceId: workspaceId as string | undefined,
  };
}

export function needsAccountTypeSetup(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.account_type !== "team" && user.account_type !== "independent";
}

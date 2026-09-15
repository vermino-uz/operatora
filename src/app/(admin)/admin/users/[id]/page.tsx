"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { formatDate, formatDateTime } from "@/features/admin/formatters";
import {
  useAddAdminUserRoleMutation,
  useAdminUserQuery,
  useAdminUserSessionsQuery,
  useImpersonateAdminUserMutation,
  useLockAdminUserMutation,
  useRemoveAdminUserRoleMutation,
  useRevokeAdminUserSessionMutation,
  useRevokeAllAdminUserSessionsMutation,
  useUnlockAdminUserMutation,
} from "@/features/admin/hooks/useAdminUsers";

const ADDABLE_ROLES = ["admin", "moderator", "sales_manager", "operator", "demo_admin", "finance_manager", "marketing_agent", "super_admin"];

/**
 * `/admin/users/:id` — real, confirmed against `admin-users.controller.ts`
 * (detail/roles/sessions) + `admin-impersonation.controller.ts` (the
 * impersonate action, ported as "copy token" rather than an actual session
 * switch — this console has no "act as user" mode yet, and stashing a
 * second user's tokens in this browser's storage would be a real security
 * footgun; the response is real, just not silently applied).
 */
export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useAdminUserQuery(id);
  const sessions = useAdminUserSessionsQuery(id);
  const lockM = useLockAdminUserMutation();
  const unlockM = useUnlockAdminUserMutation();
  const addRoleM = useAddAdminUserRoleMutation();
  const removeRoleM = useRemoveAdminUserRoleMutation();
  const revokeAllM = useRevokeAllAdminUserSessionsMutation();
  const revokeOneM = useRevokeAdminUserSessionMutation();
  const impersonateM = useImpersonateAdminUserMutation();
  const [newRole, setNewRole] = useState(ADDABLE_ROLES[0]);
  const [confirmLock, setConfirmLock] = useState(false);
  const [impersonateResult, setImpersonateResult] = useState<string | null>(null);

  if (query.isLoading) return <LoadingState label="Loading user…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;
  const u = query.data;
  if (!u) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/users" className="text-xs text-foreground/50 hover:text-foreground">
            ← Users
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{u.fullName ?? u.email}</h1>
          <p className="text-sm text-foreground/60">
            {u.email} · <span className="capitalize">{u.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {u.status === "locked" ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={unlockM.isPending}
              onPress={() => unlockM.mutate(u.id)}
            >
              Unlock
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onPress={() => setConfirmLock(true)}>
              Lock
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            isDisabled={impersonateM.isPending}
            onPress={() =>
              impersonateM.mutate(u.id, {
                onSuccess: (res) => setImpersonateResult(`Impersonation token minted for ${res.user.email}.`),
                onError: () => setImpersonateResult("Impersonation failed."),
              })
            }
          >
            Impersonate
          </Button>
        </div>
      </div>

      {impersonateResult ? <p className="text-sm text-foreground/70">{impersonateResult}</p> : null}

      <AdminSectionCard title="Profile">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Phone" value={u.phone ?? "—"} />
          <Row label="Internal number" value={u.internalNumber ?? "—"} />
          <Row label="Email verified" value={formatDate(u.emailVerifiedAt)} />
          <Row label="Failed logins" value={String(u.failedLoginCount)} />
          <Row label="Last login" value={formatDateTime(u.lastLoginAt)} />
          <Row label="Locked until" value={formatDateTime(u.lockedUntil)} />
          <Row label="Created" value={formatDate(u.createdAt)} />
        </dl>
      </AdminSectionCard>

      <AdminSectionCard
        title="Roles"
        action={
          <div className="flex gap-2">
            <AdminSelect
              aria-label="Add role"
              value={newRole}
              onChange={setNewRole}
              options={ADDABLE_ROLES.map((r) => ({ id: r, label: r }))}
              className="w-40"
            />
            <Button size="sm" variant="secondary" isDisabled={addRoleM.isPending} onPress={() => addRoleM.mutate({ userId: u.id, role: newRole })}>
              Add
            </Button>
          </div>
        }
      >
        {u.roles.length === 0 ? (
          <p className="text-sm text-foreground/50">No roles assigned.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {u.roles.map((r) => (
              <li key={r.role} className="flex items-center gap-2 rounded-full border border-divider px-3 py-1 text-sm">
                {r.role}
                <button
                  type="button"
                  className="text-foreground/40 hover:text-danger"
                  disabled={removeRoleM.isPending}
                  onClick={() => removeRoleM.mutate({ userId: u.id, role: r.role })}
                  aria-label={`Remove ${r.role}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Workspaces">
        {u.workspaces.length === 0 ? (
          <EmptyState title="No workspace memberships" />
        ) : (
          <ul className="flex flex-col gap-2">
            {u.workspaces.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-md border border-divider px-3 py-2 text-sm">
                <Link href={`/admin/workspaces/${w.id}`} className="text-foreground hover:underline">
                  {w.name}
                </Link>
                <span className="text-foreground/60">
                  {w.role} · {w.tier ?? "—"} · {w.status ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Sessions"
        action={
          <Button size="sm" variant="danger" isDisabled={revokeAllM.isPending} onPress={() => revokeAllM.mutate(u.id)}>
            Revoke all
          </Button>
        }
      >
        {sessions.isLoading ? <LoadingState label="Loading sessions…" /> : null}
        {sessions.isError ? <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} /> : null}
        {sessions.data && sessions.data.rows.length === 0 ? <EmptyState title="No active sessions" /> : null}
        {sessions.data && sessions.data.rows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sessions.data.rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-divider px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground/80">{s.userAgent ?? "Unknown device"}</p>
                  <p className="text-xs text-foreground/50">
                    {s.ipAddress ?? "—"} · created {formatDateTime(s.createdAt)} · expires {formatDateTime(s.expiresAt)}
                  </p>
                </div>
                {s.isActive ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={revokeOneM.isPending}
                    onPress={() => revokeOneM.mutate({ userId: u.id, sessionId: s.id })}
                  >
                    Revoke
                  </Button>
                ) : (
                  <span className="text-xs text-foreground/40">Revoked</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminSectionCard>

      <ConfirmDialog
        isOpen={confirmLock}
        title="Lock user"
        description={`${u.email} will be prevented from logging in until unlocked.`}
        confirmLabel="Lock"
        isDanger
        isLoading={lockM.isPending}
        onClose={() => setConfirmLock(false)}
        onConfirm={() => lockM.mutate({ id: u.id }, { onSuccess: () => setConfirmLock(false) })}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

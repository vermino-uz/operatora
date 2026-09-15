"use client";

import { useState } from "react";
import Link from "next/link";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDate, formatNumber, formatRelative, formatUsdCents } from "@/features/admin/formatters";
import {
  useAdminWorkspacesListQuery,
  useDeleteAdminWorkspaceMutation,
  useExpireAdminTariffMutation,
  useExtendAdminTrialMutation,
  useReactivateAdminWorkspaceMutation,
  useRevokeAdminTariffMutation,
  useSuspendAdminWorkspaceMutation,
} from "@/features/admin/hooks/useAdminWorkspaces";
import type { WorkspaceRow, WorkspaceSortKey } from "@/features/admin/types";
import { Button } from "@heroui/react";

const TIER_OPTIONS = [
  { id: "", label: "All tiers" },
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "max", label: "Max" },
  { id: "corporate", label: "Corporate" },
  { id: "enterprise", label: "Enterprise" },
];

const STATUS_OPTIONS = [
  { id: "", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "trialing", label: "Trialing" },
  { id: "suspended", label: "Suspended" },
  { id: "canceled", label: "Canceled" },
];

const SORT_OPTIONS: Array<{ id: WorkspaceSortKey; label: string }> = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name_asc", label: "Name A-Z" },
  { id: "most_users", label: "Most users" },
  { id: "most_tokens", label: "Most tokens" },
];

/**
 * `/admin/workspaces` — real, confirmed against `admin-workspaces.controller.ts`.
 * Ported from the old `pages/Workspaces.tsx`; filters kept as local
 * component state rather than URL state (scoped simplification for this
 * console — see PROGRESS.md Phase 2l) since these are internal-tool pages,
 * not shareable/bookmarked customer-facing views.
 */
export default function AdminWorkspacesPage() {
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<WorkspaceSortKey>("newest");
  const [page, setPage] = useState(1);

  const query = useAdminWorkspacesListQuery({ q: q || undefined, tier: tier || undefined, status: status || undefined, sort, page, perPage: 50 });

  const suspendM = useSuspendAdminWorkspaceMutation();
  const reactivateM = useReactivateAdminWorkspaceMutation();
  const extendM = useExtendAdminTrialMutation();
  const expireM = useExpireAdminTariffMutation();
  const revokeM = useRevokeAdminTariffMutation();
  const deleteM = useDeleteAdminWorkspaceMutation();

  const [expireTarget, setExpireTarget] = useState<WorkspaceRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function resetFilters() {
    setQ("");
    setSearchDraft("");
    setTier("");
    setStatus("");
    setSort("newest");
    setPage(1);
  }

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
    } catch {
      setActionError("That action failed. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Workspaces</h1>
        <p className="text-sm text-foreground/60">{query.data ? `${query.data.total} workspace(s)` : "Loading…"}</p>
      </div>

      <AdminFilterBar
        searchValue={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => {
          setQ(searchDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search name or slug…"
      >
        <AdminSelect aria-label="Tier" value={tier} onChange={(v) => { setTier(v); setPage(1); }} options={TIER_OPTIONS} className="w-40" />
        <AdminSelect aria-label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} className="w-44" />
        <AdminSelect aria-label="Sort" value={sort} onChange={(v) => setSort(v as WorkspaceSortKey)} options={SORT_OPTIONS} className="w-44" />
        {(q || tier || status || sort !== "newest") && (
          <Button size="sm" variant="secondary" onPress={resetFilters}>
            Clear
          </Button>
        )}
      </AdminFilterBar>

      {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}

      {query.isLoading ? <LoadingState label="Loading workspaces…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}

      {query.data && query.data.rows.length === 0 ? (
        <EmptyState title="No workspaces found" description="Try adjusting your filters." />
      ) : null}

      {query.data && query.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-foreground/5">
              <tr>
                {["Name", "Owner", "Tier", "Status", "Trial ends", "Users", "AI spend (30d)", "Created", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((w) => (
                <tr key={w.id} className="border-t border-divider/60">
                  <td className="px-3 py-3">
                    <Link href={`/admin/workspaces/${w.id}`} className="font-medium text-foreground hover:underline">
                      {w.name}
                    </Link>
                    {w.slug ? <p className="text-xs text-foreground/50">@{w.slug}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground/70">{w.ownerEmail ?? "—"}</td>
                  <td className="px-3 py-3 text-sm capitalize text-foreground/70">{w.tier ?? "—"}</td>
                  <td className="px-3 py-3 text-sm capitalize text-foreground/70">{w.status ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-foreground/70">{w.trialEndsAt ? formatDate(w.trialEndsAt) : "—"}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground/70">{formatNumber(w.userCount)}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground/70">{formatUsdCents(w.aiSpend30dCents)}</td>
                  <td className="px-3 py-3 text-sm text-foreground/50">{formatRelative(w.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="secondary" onPress={() => runAction(() => extendM.mutateAsync({ id: w.id, days: 7 }))}>
                        +7d trial
                      </Button>
                      {w.status === "suspended" ? (
                        <Button size="sm" variant="secondary" onPress={() => runAction(() => reactivateM.mutateAsync(w.id))}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onPress={() => runAction(() => suspendM.mutateAsync({ id: w.id }))}>
                          Suspend
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onPress={() => setExpireTarget(w)}>
                        Expire
                      </Button>
                      <Button size="sm" variant="danger" onPress={() => setRevokeTarget(w)}>
                        Revoke
                      </Button>
                      <Button size="sm" variant="danger" onPress={() => setDeleteTarget(w)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {query.data ? <AdminPagination page={query.data.page} total={query.data.total} perPage={query.data.perPage} onPageChange={setPage} /> : null}

      <ConfirmDialog
        isOpen={!!expireTarget}
        title="Expire tariff"
        description={expireTarget ? <>{expireTarget.name} keeps its tier, but its subscription end is set to now — the customer sees the expired paywall until renewal.</> : null}
        confirmLabel="Expire now"
        isLoading={expireM.isPending}
        onClose={() => setExpireTarget(null)}
        onConfirm={() => expireTarget && runAction(() => expireM.mutateAsync(expireTarget.id)).then(() => setExpireTarget(null))}
      />
      <ConfirmDialog
        isOpen={!!revokeTarget}
        title="Revoke tariff"
        description={revokeTarget ? <>{revokeTarget.name} is downgraded to Free with blocked access until it subscribes again.</> : null}
        confirmLabel="Revoke"
        isDanger
        isLoading={revokeM.isPending}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && runAction(() => revokeM.mutateAsync(revokeTarget.id)).then(() => setRevokeTarget(null))}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete workspace"
        description={deleteTarget ? <>{deleteTarget.name} and all its data (leads, conversations, integrations) will be permanently deleted. This can&apos;t be undone.</> : null}
        confirmLabel="Delete"
        isDanger
        isLoading={deleteM.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && runAction(() => deleteM.mutateAsync(deleteTarget.id)).then(() => setDeleteTarget(null))}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDate } from "@/features/admin/formatters";
import {
  useAdminUsersListQuery,
  useDeleteAdminUserMutation,
  useLockAdminUserMutation,
  useUnlockAdminUserMutation,
} from "@/features/admin/hooks/useAdminUsers";
import type { UserRow } from "@/features/admin/types";

const STATUS_OPTIONS = [
  { id: "", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "locked", label: "Locked" },
  { id: "inactive", label: "Inactive" },
];

/** `/admin/users` — real, confirmed against `admin-users.controller.ts`. */
export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useAdminUsersListQuery({ q: q || undefined, status: status || undefined, page, perPage: 50 });
  const lockM = useLockAdminUserMutation();
  const unlockM = useUnlockAdminUserMutation();
  const deleteM = useDeleteAdminUserMutation();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-foreground/60">{query.data ? `${query.data.total} user(s)` : "Loading…"}</p>
      </div>

      <AdminFilterBar
        searchValue={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => {
          setQ(searchDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search name or email…"
      >
        <AdminSelect aria-label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} className="w-44" />
      </AdminFilterBar>

      {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}

      {query.isLoading ? <LoadingState label="Loading users…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}
      {query.data && query.data.rows.length === 0 ? <EmptyState title="No users found" /> : null}

      {query.data && query.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-foreground/5">
              <tr>
                {["Name", "Email", "Roles", "Workspaces", "Status", "Last login", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((u) => (
                <tr key={u.id} className="border-t border-divider/60">
                  <td className="px-3 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                      {u.fullName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground/70">{u.email}</td>
                  <td className="px-3 py-3 text-sm text-foreground/70">{u.roles.join(", ") || "—"}</td>
                  <td className="px-3 py-3 text-sm text-foreground/70">{u.workspaceCount}</td>
                  <td className="px-3 py-3 text-sm capitalize text-foreground/70">{u.status}</td>
                  <td className="px-3 py-3 text-sm text-foreground/50">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {u.status === "locked" ? (
                        <Button size="sm" variant="secondary" onPress={() => runAction(() => unlockM.mutateAsync(u.id))}>
                          Unlock
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onPress={() => runAction(() => lockM.mutateAsync({ id: u.id }))}>
                          Lock
                        </Button>
                      )}
                      <Button size="sm" variant="danger" onPress={() => setDeleteTarget(u)}>
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
        isOpen={!!deleteTarget}
        title="Delete user"
        description={deleteTarget ? <>{deleteTarget.email} will be permanently deleted. This can&apos;t be undone.</> : null}
        confirmLabel="Delete"
        isDanger
        isLoading={deleteM.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && runAction(() => deleteM.mutateAsync(deleteTarget.id)).then(() => setDeleteTarget(null))}
      />
    </div>
  );
}

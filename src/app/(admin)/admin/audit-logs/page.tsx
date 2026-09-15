"use client";

import { useState } from "react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDateTime } from "@/features/admin/formatters";
import { useAdminAuditLogsQuery } from "@/features/admin/hooks/useAdminAuditLogs";

/** `GET /admin/audit-logs` — real, confirmed against
 * `admin-audit-logs.controller.ts`. Read-only, populated by every mutating
 * admin action ported in this phase (`AdminAuditService.record`). */
export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [page, setPage] = useState(1);
  const query = useAdminAuditLogsQuery({ action: action || undefined, page, perPage: 50 });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit logs</h1>
        <p className="text-sm text-foreground/60">{query.data ? `${query.data.total} event(s)` : "Loading…"}</p>
      </div>

      <AdminFilterBar
        searchValue={actionDraft}
        onSearchChange={setActionDraft}
        onSearchSubmit={() => {
          setAction(actionDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Filter by action (e.g. workspace.suspend)…"
      />

      {query.isLoading ? <LoadingState label="Loading audit logs…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}
      {query.data && query.data.rows.length === 0 ? <EmptyState title="No audit events" /> : null}

      {query.data && query.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-foreground/5">
              <tr>
                {["When", "Actor", "Action", "Entity", "IP"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((log) => (
                <tr key={log.id} className="border-t border-divider/60">
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-foreground/70">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2 text-sm text-foreground">{log.actorEmail ?? "system"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs">{log.action}</span>
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground/70">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground/50">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {query.data ? <AdminPagination page={query.data.page} total={query.data.total} perPage={query.data.perPage} onPageChange={setPage} /> : null}
    </div>
  );
}

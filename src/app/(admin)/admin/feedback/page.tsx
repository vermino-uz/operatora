"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDateTime } from "@/features/admin/formatters";
import {
  useAdminFeedbackListQuery,
  useDeleteAdminFeedbackMutation,
  useUpdateAdminFeedbackStatusMutation,
} from "@/features/admin/hooks/useAdminFeedback";
import type { FeedbackRow } from "@/features/admin/types";

const STATUS_OPTIONS = [
  { id: "", label: "All statuses" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { id: "", label: "All severities" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];

/** `/admin/feedback/*` — real, confirmed against `admin-feedback.controller.ts`. */
export default function AdminFeedbackPage() {
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const query = useAdminFeedbackListQuery({ q: q || undefined, status: status || undefined, severity: severity || undefined, page, perPage: 50 });
  const updateStatusM = useUpdateAdminFeedbackStatusMutation();
  const deleteM = useDeleteAdminFeedbackMutation();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackRow | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
        <p className="text-sm text-foreground/60">{query.data ? `${query.data.total} submission(s)` : "Loading…"}</p>
      </div>

      <AdminFilterBar
        searchValue={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => {
          setQ(searchDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search content…"
      >
        <AdminSelect aria-label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} className="w-44" />
        <AdminSelect aria-label="Severity" value={severity} onChange={(v) => { setSeverity(v); setPage(1); }} options={SEVERITY_OPTIONS} className="w-44" />
      </AdminFilterBar>

      {query.isLoading ? <LoadingState label="Loading feedback…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}
      {query.data && query.data.rows.length === 0 ? <EmptyState title="No feedback found" /> : null}

      {query.data && query.data.rows.length > 0 ? (
        <div className="flex flex-col gap-2">
          {query.data.rows.map((f) => (
            <div key={f.id} className="rounded-md border border-divider p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{f.title ?? f.type}</p>
                  <p className="text-xs text-foreground/50">
                    {f.userEmail ?? "anonymous"} · {formatDateTime(f.createdAt)}
                    {f.severity ? ` · ${f.severity}` : ""}
                    {f.routePath ? ` · ${f.routePath}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminSelect
                    aria-label="Status"
                    value={f.status}
                    onChange={(v) => updateStatusM.mutate({ id: f.id, status: v })}
                    options={STATUS_OPTIONS.filter((o) => o.id)}
                    className="w-40"
                  />
                  <Button size="sm" variant="danger" onPress={() => setDeleteTarget(f)}>
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{f.content}</p>
              {f.adminNotes ? <p className="mt-1 text-xs text-foreground/50">Notes: {f.adminNotes}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {query.data ? <AdminPagination page={query.data.page} total={query.data.total} perPage={query.data.perPage} onPageChange={setPage} /> : null}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete feedback"
        description="This submission will be permanently deleted."
        confirmLabel="Delete"
        isDanger
        isLoading={deleteM.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteM.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}

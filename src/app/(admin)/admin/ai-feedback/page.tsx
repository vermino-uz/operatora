"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDateTime } from "@/features/admin/formatters";
import { useAdminAiFeedbackListQuery, useReviewAdminAiFeedbackMutation } from "@/features/admin/hooks/useAdminAiFeedback";

const STATUS_OPTIONS = [
  { id: "", label: "All statuses" },
  { id: "unreviewed", label: "Unreviewed" },
  { id: "reviewed", label: "Reviewed" },
  { id: "flagged", label: "Flagged" },
];

/**
 * `/admin/ai-feedback/*` — real, confirmed against
 * `admin-ai-feedback.controller.ts` (agent-reply thumbs up/down review
 * queue, distinct from the user-submitted app `Feedback` page). Same
 * "not in the original brief, but live" case as Analytics — ported.
 */
export default function AdminAiFeedbackPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = useAdminAiFeedbackListQuery({ status: status || undefined, page, perPage: 50 });
  const reviewM = useReviewAdminAiFeedbackMutation();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Agent feedback</h1>
        <p className="text-sm text-foreground/60">Thumbs up/down feedback on AI agent replies.</p>
      </div>

      {query.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AdminKpiCard label="Unreviewed" value={query.data.summary.unreviewed} />
          <AdminKpiCard label="Useful" value={query.data.summary.useful} />
          <AdminKpiCard label="Not useful" value={query.data.summary.notUseful} />
        </div>
      ) : null}

      <AdminSelect aria-label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} className="w-44" />

      {query.isLoading ? <LoadingState label="Loading feedback…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}
      {query.data && query.data.rows.length === 0 ? <EmptyState title="No agent feedback" /> : null}

      {query.data && query.data.rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {query.data.rows.map((f) => (
            <li key={f.id} className="rounded-md border border-divider p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">
                    <span className={f.rating > 0 ? "text-success" : "text-danger"}>{f.rating > 0 ? "👍 Useful" : "👎 Not useful"}</span>{" "}
                    · {f.userEmail ?? "—"} · {f.workspaceName ?? "—"}
                  </p>
                  <p className="text-xs text-foreground/50">{formatDateTime(f.createdAt)}</p>
                </div>
                <Button size="sm" variant="secondary" onPress={() => reviewM.mutate({ id: f.id, patch: { reviewStatus: "reviewed" } })}>
                  Mark reviewed
                </Button>
              </div>
              {f.reasonText ? <p className="mt-2 text-sm text-foreground/80">{f.reasonText}</p> : null}
              {f.adminNotes ? <p className="mt-1 text-xs text-foreground/50">Notes: {f.adminNotes}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {query.data ? <AdminPagination page={query.data.page} total={query.data.total} perPage={query.data.perPage} onPageChange={setPage} /> : null}
    </div>
  );
}

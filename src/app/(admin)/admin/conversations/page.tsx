"use client";

import { useState } from "react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatDate, formatNumber } from "@/features/admin/formatters";
import { useAdminConversationsListQuery, useAdminConversationsStatsQuery } from "@/features/admin/hooks/useAdminConversations";

/** `/admin/conversations` + `/admin/conversations/stats` — real, confirmed
 * against `admin-conversations.controller.ts`. Read-only (no writer on the
 * old admin page either — it's a review/monitoring screen). */
export default function AdminConversationsPage() {
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const filters = { q: q || undefined, page, perPage: 50 };
  const query = useAdminConversationsListQuery(filters);
  const stats = useAdminConversationsStatsQuery(filters);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Conversations</h1>
        <p className="text-sm text-foreground/60">{query.data ? `${query.data.total} conversation(s)` : "Loading…"}</p>
      </div>

      {stats.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <AdminKpiCard label="Total" value={formatNumber(stats.data.total)} />
          <AdminKpiCard label="Completed" value={formatNumber(stats.data.completed)} />
          <AdminKpiCard label="Avg. AI score" value={stats.data.avgScore.toFixed(1)} />
          <AdminKpiCard label="Avg. duration" value={`${Math.round(stats.data.avgDurationSec)}s`} />
        </div>
      ) : null}

      <AdminFilterBar
        searchValue={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => {
          setQ(searchDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search operator, phone, workspace…"
      />

      {query.isLoading ? <LoadingState label="Loading conversations…" className="py-16" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" /> : null}
      {query.data && query.data.rows.length === 0 ? <EmptyState title="No conversations found" /> : null}

      {query.data && query.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-foreground/5">
              <tr>
                {["Operator", "Client", "Workspace", "Status", "Sentiment", "AI score", "Duration", "Created"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((c) => (
                <tr key={c.id} className="border-t border-divider/60">
                  <td className="px-3 py-2 text-sm text-foreground">{c.operatorName}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{c.clientName || c.clientPhone || "—"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{c.workspaceName ?? "—"}</td>
                  <td className="px-3 py-2 text-sm capitalize text-foreground/70">{c.status ?? "—"}</td>
                  <td className="px-3 py-2 text-sm capitalize text-foreground/70">{c.sentiment ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{c.aiScore ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{c.durationSec ? `${c.durationSec}s` : "—"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/50">{formatDate(c.createdAt)}</td>
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

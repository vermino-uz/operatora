"use client";

import { useState } from "react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { formatDate } from "@/features/admin/formatters";
import { useAdminIntegrationsQuery } from "@/features/admin/hooks/useAdminIntegrations";
import type { IntegrationKind } from "@/features/admin/types";

const KIND_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "", label: "All kinds" },
  { id: "telegram", label: "Telegram" },
  { id: "sip", label: "SIP" },
  { id: "sms", label: "SMS" },
  { id: "google_sheets", label: "Google Sheets" },
];

/** `GET /admin/integrations` — real, confirmed against
 * `admin-integrations.controller.ts`. Read-only health/status view. */
export default function AdminIntegrationsPage() {
  const [kind, setKind] = useState("");
  const query = useAdminIntegrationsQuery({ kind: (kind || undefined) as IntegrationKind | undefined });

  if (query.isLoading) return <LoadingState label="Loading integrations…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;
  const data = query.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-foreground/60">Cross-workspace integration health.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {Object.entries(data.totals).map(([k, v]) => (
          <AdminKpiCard key={k} label={k} value={`${v.active} / ${v.total}`} sub="active / total" />
        ))}
      </div>

      <AdminSelect aria-label="Kind" value={kind} onChange={setKind} options={KIND_OPTIONS} className="w-48" />

      {data.rows.length === 0 ? (
        <EmptyState title="No integrations found" />
      ) : (
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-foreground/5">
              <tr>
                {["Kind", "Label", "Workspace", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-medium text-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-t border-divider/60">
                  <td className="px-3 py-2 text-sm capitalize text-foreground">{row.kind.replace("_", " ")}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{row.label}</td>
                  <td className="px-3 py-2 text-sm text-foreground/70">{row.workspaceName ?? "—"}</td>
                  <td className={`px-3 py-2 text-sm ${row.isActive ? "text-success" : "text-foreground/40"}`}>{row.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2 text-sm text-foreground/50">{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

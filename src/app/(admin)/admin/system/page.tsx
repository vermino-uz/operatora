"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { formatBytes, formatNumber } from "@/features/admin/formatters";
import {
  useAdminAiInstructionsQuery,
  useAdminAppInfoQuery,
  useAdminSystemHealthQuery,
  useCreateAdminAiInstructionMutation,
  useDeleteAdminAiInstructionMutation,
  useUpdateAdminAiInstructionMutation,
  useUpdateAdminAppInfoMutation,
} from "@/features/admin/hooks/useAdminSystem";
import type { AiInstructionRow } from "@/features/admin/types";

/** `/admin/system/*` — real, confirmed against `admin-system.controller.ts`. */
export default function AdminSystemPage() {
  const health = useAdminSystemHealthQuery();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">System</h1>
        <p className="text-sm text-foreground/60">Platform health, mobile app gating, and global AI instructions.</p>
      </div>

      {health.isLoading ? <LoadingState label="Loading health…" /> : null}
      {health.isError ? <ErrorState error={health.error} onRetry={() => health.refetch()} /> : null}
      {health.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <AdminKpiCard label="Workspaces" value={formatNumber(health.data.workspaces)} />
          <AdminKpiCard label="Users" value={formatNumber(health.data.users)} />
          <AdminKpiCard label="Conversations" value={formatNumber(health.data.conversations)} />
          <AdminKpiCard label="Leads" value={formatNumber(health.data.leads)} />
          <AdminKpiCard label="AI instructions" value={formatNumber(health.data.aiInstructions)} />
          <AdminKpiCard label="DB size" value={health.data.dbSizeBytes ? formatBytes(health.data.dbSizeBytes) : "—"} />
        </div>
      ) : null}

      <AppInfoSection />
      <AiInstructionsSection />
    </div>
  );
}

function AppInfoSection() {
  const query = useAdminAppInfoQuery();
  const updateM = useUpdateAdminAppInfoMutation();
  const [lastVersion, setLastVersion] = useState("");
  const [lastAllowed, setLastAllowed] = useState("");
  const [saved, setSaved] = useState(false);

  if (query.isLoading) return <LoadingState label="Loading app info…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const current = query.data;
  const version = lastVersion || current?.last_version || "";
  const allowed = lastAllowed || current?.last_allowed_version || "";

  return (
    <AdminSectionCard title="Mobile app gating">
      <div className="flex flex-wrap items-end gap-3">
        <TextField>
          <Label>Latest version</Label>
          <Input value={version} onChange={(e) => setLastVersion(e.target.value)} placeholder="1.0.0" />
        </TextField>
        <TextField>
          <Label>Last allowed version</Label>
          <Input value={allowed} onChange={(e) => setLastAllowed(e.target.value)} placeholder="1.0.0" />
        </TextField>
        <Button
          size="sm"
          isDisabled={updateM.isPending}
          onPress={() => {
            setSaved(false);
            updateM.mutate({ last_version: version || null, last_allowed_version: allowed || null }, { onSuccess: () => setSaved(true) });
          }}
        >
          {updateM.isPending ? "Saving…" : "Save"}
        </Button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
      </div>
    </AdminSectionCard>
  );
}

function AiInstructionsSection() {
  const query = useAdminAiInstructionsQuery();
  const createM = useCreateAdminAiInstructionMutation();
  const updateM = useUpdateAdminAiInstructionMutation();
  const deleteM = useDeleteAdminAiInstructionMutation();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AiInstructionRow | null>(null);

  return (
    <AdminSectionCard title="Global AI instructions">
      {query.isLoading ? <LoadingState label="Loading instructions…" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No global AI instructions yet" /> : null}
      {query.data && query.data.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-2">
          {query.data.map((i) => (
            <li key={i.id} className="rounded-md border border-divider p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{i.name}</p>
                  <p className="text-xs text-foreground/50">{i.category} · priority {i.priority}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => updateM.mutate({ id: i.id, patch: { isActive: !i.isActive } })}
                  >
                    {i.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="danger" onPress={() => setDeleteTarget(i)}>
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/70">{i.instructionText}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <p className="text-sm font-medium text-foreground">Add new</p>
        <TextField>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Instruction name" />
        </TextField>
        <TextField>
          <Label>Instruction text</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="What the AI agent should do…" />
        </TextField>
        <Button
          size="sm"
          className="self-start"
          isDisabled={!name.trim() || !text.trim() || createM.isPending}
          onPress={() =>
            createM.mutate(
              { name: name.trim(), instructionText: text.trim() },
              {
                onSuccess: () => {
                  setName("");
                  setText("");
                },
              },
            )
          }
        >
          {createM.isPending ? "Adding…" : "Add instruction"}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete instruction"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted.` : null}
        confirmLabel="Delete"
        isDanger
        isLoading={deleteM.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteM.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </AdminSectionCard>
  );
}

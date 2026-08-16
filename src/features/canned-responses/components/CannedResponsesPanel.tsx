"use client";

import { useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Pencil, Plus, QuoteOpen, TrashBin } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useCannedResponsesQuery, useDeleteCannedResponseMutation } from "@/features/canned-responses/hooks/useCannedResponses";
import { formatShortcut, type CannedResponseRow } from "@/features/canned-responses/types";
import { CannedResponseModal } from "@/features/canned-responses/components/CannedResponseModal";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to delete canned responses.";
    return error.message;
  }
  return "Couldn't delete this response.";
}

/**
 * Canned Responses — shortcut replies for chat channels. `POST
 * /db/canned_responses/query` (select/insert/update/delete), workspace-
 * scoped server-side. See `features/canned-responses/types.ts` for the
 * confirmed contract traced from the old frontend's
 * `CannedResponsesSettings.tsx`.
 */
export function CannedResponsesPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const responsesQuery = useCannedResponsesQuery(workspaceId);
  const deleteResponse = useDeleteCannedResponseMutation(workspaceId);
  const modalState = useOverlayState();
  const [editing, setEditing] = useState<CannedResponseRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    modalState.open();
  }

  function openEdit(row: CannedResponseRow) {
    setEditing(row);
    modalState.open();
  }

  async function remove(row: CannedResponseRow) {
    if (deleteResponse.isPending) return; // guard double-submit
    if (!window.confirm(`Delete ${formatShortcut(row.shortcut)}?`)) return;
    setDeleteError(null);
    setPendingDeleteId(row.id);
    try {
      await deleteResponse.mutateAsync(row.id);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    } finally {
      setPendingDeleteId(null);
    }
  }

  const shellProps = {
    title: "Canned Responses",
    subtitle: "Shortcut replies for Telegram and other channels (e.g. /greeting → Hello there).",
    actions: workspaceId ? (
      <Button size="sm" onPress={openCreate}>
        <Plus className="size-3.5" />
        Add response
      </Button>
    ) : undefined,
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (responsesQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading canned responses…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (responsesQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={responsesQuery.error} onRetry={() => responsesQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const rows = responsesQuery.data ?? [];
  const nextDisplayOrder = rows.length;

  return (
    <SettingsSectionShell {...shellProps}>
      {deleteError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No canned responses yet"
          description="Add a shortcut reply operators can insert with a slash command."
          action={
            <Button size="sm" className="mt-2" onPress={openCreate}>
              Add your first response
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-4 px-4 py-3.5">
              <QuoteOpen className="mt-0.5 size-4 shrink-0 text-foreground/30" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                    {formatShortcut(row.shortcut)}
                  </code>
                  {!row.is_active ? (
                    <Chip size="sm" color="default" variant="soft">
                      <Chip.Label>Inactive</Chip.Label>
                    </Chip>
                  ) : null}
                  {(row.channels ?? []).map((c) => (
                    <Chip key={c} size="sm" color="default" variant="soft">
                      <Chip.Label className="capitalize">{c}</Chip.Label>
                    </Chip>
                  ))}
                </div>
                <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-foreground/80">{row.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" isIconOnly aria-label="Edit" onPress={() => openEdit(row)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Delete"
                  onPress={() => void remove(row)}
                  isDisabled={pendingDeleteId === row.id}
                >
                  <TrashBin className="size-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CannedResponseModal
        workspaceId={workspaceId}
        userId={userId}
        state={modalState}
        editing={editing}
        nextDisplayOrder={nextDisplayOrder}
      />
    </SettingsSectionShell>
  );
}

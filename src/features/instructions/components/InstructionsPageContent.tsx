"use client";

import { useState } from "react";
import { Button, Tabs, useOverlayState } from "@heroui/react";
import { BookOpen, Link, GraduationCap, Plus } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { canEditInstructions } from "@/features/instructions/permissions";
import {
  useDeleteInstructionMutation,
  useInstructionsQuery,
  useReorderInstructionsMutation,
} from "@/features/instructions/hooks/useInstructions";
import { InstructionCard } from "@/features/instructions/components/InstructionCard";
import { InstructionFormModal } from "@/features/instructions/components/InstructionFormModal";
import { QuickLinksPanel } from "@/features/instructions/components/QuickLinksPanel";
import { AiMentorPanel } from "@/features/instructions/components/AiMentorPanel";
import type { InstructionRow } from "@/features/instructions/types";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to delete instructions.";
    return error.message;
  }
  return "Couldn't delete this instruction.";
}

/**
 * `/instructions` — reference: old frontend's `pages/Instructions.tsx`.
 * Three tabs, all real: Instructions (the `instructions` table CRUD, see
 * `services/api/instructions.ts`), Quick Links (`quick_links` table), and
 * AI Mentor (real coaching chat via `POST /fn/ai-mentor`). Reordering uses
 * simple up/down buttons rather than the old page's `react-dnd`
 * drag-and-drop (no new dependency added for this rebuild) — same
 * `display_order` persistence underneath.
 */
export function InstructionsPageContent() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const roles = useSessionStore((s) => s.roles);
  const user = useSessionStore((s) => s.user);
  const canEdit = canEditInstructions(roles);

  const instructionsQuery = useInstructionsQuery(workspaceId);
  const deleteMutation = useDeleteInstructionMutation(workspaceId);
  const reorderMutation = useReorderInstructionsMutation(workspaceId);
  const formState = useOverlayState();
  const [editing, setEditing] = useState<InstructionRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    formState.open();
  }

  function openEdit(row: InstructionRow) {
    setEditing(row);
    formState.open();
  }

  async function remove(row: InstructionRow) {
    if (deleteMutation.isPending) return; // guard double-submit
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    setDeleteError(null);
    setPendingDeleteId(row.id);
    try {
      await deleteMutation.mutateAsync(row.id);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function move(rows: InstructionRow[], index: number, direction: -1 | 1) {
    if (reorderMutation.isPending) return; // guard double-submit
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    await reorderMutation.mutateAsync(next.map((r, i) => ({ id: r.id, display_order: i })));
  }

  if (!workspaceId) {
    return (
      <div className="p-6">
        <ErrorState error={new Error("No workspace selected")} />
      </div>
    );
  }

  const rows = instructionsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-foreground">Instructions</h1>

      <Tabs defaultSelectedKey="instructions">
        <Tabs.List>
          <Tabs.Tab id="instructions">
            <BookOpen className="mr-1.5 inline size-4" aria-hidden="true" />
            Instructions
          </Tabs.Tab>
          <Tabs.Tab id="quick-links">
            <Link className="mr-1.5 inline size-4" aria-hidden="true" />
            Quick Links
          </Tabs.Tab>
          <Tabs.Tab id="ai-mentor">
            <GraduationCap className="mr-1.5 inline size-4" aria-hidden="true" />
            AI Mentor
          </Tabs.Tab>
        </Tabs.List>

        <div className="pt-4">
          <Tabs.Panel id="instructions">
            {canEdit ? (
              <div className="mb-3 flex justify-end">
                <Button size="sm" onPress={openCreate}>
                  <Plus className="size-3.5" />
                  New instruction
                </Button>
              </div>
            ) : null}

            {deleteError ? (
              <p role="alert" className="mb-3 text-sm text-danger">
                {deleteError}
              </p>
            ) : null}

            {instructionsQuery.isLoading ? (
              <LoadingState label="Loading instructions…" className="py-16" />
            ) : instructionsQuery.isError ? (
              <ErrorState error={instructionsQuery.error} onRetry={() => instructionsQuery.refetch()} className="py-16" />
            ) : rows.length === 0 ? (
              <EmptyState
                title="No instructions yet"
                description="Add operating guidelines and talk tracks for operators to follow."
                action={
                  canEdit ? (
                    <Button size="sm" className="mt-2" onPress={openCreate}>
                      Add your first instruction
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rows.map((row, index) => (
                  <InstructionCard
                    key={row.id}
                    instruction={row}
                    canEdit={canEdit}
                    canMoveUp={index > 0}
                    canMoveDown={index < rows.length - 1}
                    isDeleting={pendingDeleteId === row.id}
                    onEdit={() => openEdit(row)}
                    onDelete={() => void remove(row)}
                    onMoveUp={() => void move(rows, index, -1)}
                    onMoveDown={() => void move(rows, index, 1)}
                  />
                ))}
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="quick-links">
            <QuickLinksPanel workspaceId={workspaceId} canEdit={canEdit} />
          </Tabs.Panel>

          <Tabs.Panel id="ai-mentor">
            <AiMentorPanel />
          </Tabs.Panel>
        </div>
      </Tabs>

      {canEdit ? (
        <InstructionFormModal
          workspaceId={workspaceId}
          createdBy={user?.email ?? user?.id ?? null}
          state={formState}
          editing={editing}
          nextDisplayOrder={rows.length}
        />
      ) : null}
    </div>
  );
}

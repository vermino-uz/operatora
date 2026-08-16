"use client";

import { useState } from "react";
import { Button, Chip, Modal } from "@heroui/react";
import { ArrowRotateRight, CodeMerge, Star, StarFill, TrashBin } from "@gravity-ui/icons";

import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { RowCheckbox } from "@/features/leads/components/RowCheckbox";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import {
  useDeleteDuplicateLeadsMutation,
  useDuplicateLeadsQuery,
  useMergeDuplicateLeadsMutation,
} from "@/features/leads/hooks/useDuplicateLeads";
import type { DuplicateLeadGroup } from "@/services/api/duplicateLeads";
import type { LeadRow } from "@/features/leads/types";

/**
 * Duplicate lead detection — `GET /duplicated-leads?boardId=` scan, grouped
 * results, star-to-pick-primary merge (`POST /duplicated-leads/merge`, a
 * real atomic server operation — see `services/api/duplicateLeads.ts`'s
 * header comment for the full trace/risk note), and bulk delete of
 * non-primary duplicates as an alternative to merging
 * (`DELETE /duplicated-leads`). UX flow follows the old frontend's
 * `DuplicateLeadsDialog.tsx` (star-to-pick-primary, per-group merge button,
 * cross-group checkbox selection for bulk delete) — rebuilt on this app's
 * own component/hook patterns, not a visual copy.
 */
export function DuplicateLeadsDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const query = useDuplicateLeadsQuery(boardId, true);
  const deleteMutation = useDeleteDuplicateLeadsMutation(boardId);
  const mergeMutation = useMergeDuplicateLeadsMutation(boardId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [mergingGroupKey, setMergingGroupKey] = useState<string | null>(null);

  const groups = query.data ?? [];
  const busy = deleteMutation.isPending || mergeMutation.isPending;

  function primaryForGroup(group: DuplicateLeadGroup): string | undefined {
    return primaryByGroup[group.key] ?? group.leads.find((l) => l.sold)?.id ?? group.leads[0]?.id;
  }

  function toggleLead(leadId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function toggleGroupAll(group: DuplicateLeadGroup) {
    const allSelected = group.leads.every((l) => selected.has(l.id));
    setSelected((prev) => {
      const next = new Set(prev);
      group.leads.forEach((l) => (allSelected ? next.delete(l.id) : next.add(l.id)));
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (busy || selected.size === 0) return; // guard double-submit + empty no-op
    if (!window.confirm(`Delete ${selected.size} selected lead(s)? This can't be undone from here (they move to Trash).`)) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(Array.from(selected));
      setSelected(new Set());
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handleMergeGroup(group: DuplicateLeadGroup) {
    if (busy) return; // guard double-submit
    const primaryId = primaryForGroup(group);
    if (!primaryId) return;
    const otherIds = group.leads.map((l) => l.id).filter((id) => id !== primaryId);
    if (!otherIds.length) return;
    if (
      !window.confirm(
        `Merge ${otherIds.length} lead(s) into the starred lead? Their phones, comments, and chats move to the survivor, and it stays sold if any of them were sold. The rest are moved to Trash.`,
      )
    ) {
      return;
    }
    setError(null);
    setMergingGroupKey(group.key);
    try {
      await mergeMutation.mutateAsync({ primaryLeadId: primaryId, duplicateLeadIds: otherIds });
      setSelected((prev) => {
        const next = new Set(prev);
        otherIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setMergingGroupKey(null);
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <CodeMerge className="size-4 text-primary" aria-hidden="true" />
                Duplicate leads
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground/60">
                  Scans this board for leads sharing the same phone number or full name.
                </p>
                <Button variant="secondary" size="sm" isDisabled={query.isFetching} onPress={() => void query.refetch()}>
                  <ArrowRotateRight className="size-3.5" aria-hidden="true" />
                  Rescan
                </Button>
              </div>

              {query.isLoading ? (
                <LoadingState label="Scanning for duplicates…" />
              ) : query.isError ? (
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
              ) : groups.length === 0 ? (
                <EmptyState title="No duplicates found" description="Every lead on this board has a unique phone number and name." />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.08] bg-[var(--default)] px-3 py-2.5 dark:border-white/[0.12]">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {groups.length} duplicate group{groups.length === 1 ? "" : "s"} found
                      </p>
                      <p className="text-xs text-foreground/50">{selected.size} lead(s) selected for deletion</p>
                    </div>
                    {selected.size > 0 ? (
                      <Button variant="danger" size="sm" isDisabled={busy} onPress={() => void handleDeleteSelected()}>
                        <TrashBin className="size-3.5" aria-hidden="true" />
                        Delete {selected.size} selected
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3">
                    {groups.map((group) => (
                      <DuplicateGroupCard
                        key={group.key}
                        group={group}
                        primaryLeadId={primaryForGroup(group)}
                        selected={selected}
                        onTogglePrimary={(leadId) => setPrimaryByGroup((prev) => ({ ...prev, [group.key]: leadId }))}
                        onToggleLead={toggleLead}
                        onToggleAll={() => toggleGroupAll(group)}
                        onMerge={() => void handleMergeGroup(group)}
                        isMerging={mergingGroupKey === group.key && mergeMutation.isPending}
                        mergeDisabled={busy}
                      />
                    ))}
                  </div>
                </>
              )}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DuplicateGroupCard({
  group,
  primaryLeadId,
  selected,
  onTogglePrimary,
  onToggleLead,
  onToggleAll,
  onMerge,
  isMerging,
  mergeDisabled,
}: {
  group: DuplicateLeadGroup;
  primaryLeadId: string | undefined;
  selected: Set<string>;
  onTogglePrimary: (leadId: string) => void;
  onToggleLead: (leadId: string) => void;
  onToggleAll: () => void;
  onMerge: () => void;
  isMerging: boolean;
  mergeDisabled: boolean;
}) {
  const allSelected = group.leads.length > 0 && group.leads.every((l) => selected.has(l.id));
  const someSelected = group.leads.some((l) => selected.has(l.id));

  return (
    <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="secondary">
            <Chip.Label>Matched by {group.duplicateBy}</Chip.Label>
          </Chip>
          <span className="text-xs text-foreground/50">{group.leads.length} leads</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" isDisabled={mergeDisabled || !primaryLeadId} onPress={onMerge}>
            <CodeMerge className="size-3.5" aria-hidden="true" />
            {isMerging ? "Merging…" : "Merge into starred"}
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-foreground/60">
            <RowCheckbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onChange={onToggleAll}
              label={`Select all leads in ${group.duplicateBy} group`}
            />
            Select all
          </label>
        </div>
      </div>
      <p className="mb-2 text-xs text-foreground/50">Click the star to choose which lead survives a merge — the rest are absorbed into it.</p>

      <div className="flex flex-col gap-2">
        {group.leads.map((lead) => (
          <DuplicateLeadRow
            key={lead.id}
            lead={lead}
            isPrimary={primaryLeadId === lead.id}
            isSelected={selected.has(lead.id)}
            onTogglePrimary={() => onTogglePrimary(lead.id)}
            onToggleSelected={() => onToggleLead(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DuplicateLeadRow({
  lead,
  isPrimary,
  isSelected,
  onTogglePrimary,
  onToggleSelected,
}: {
  lead: LeadRow;
  isPrimary: boolean;
  isSelected: boolean;
  onTogglePrimary: () => void;
  onToggleSelected: () => void;
}) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed lead";
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
        isPrimary ? "border-primary bg-primary/5" : "border-black/[0.06] dark:border-white/[0.08]"
      }`}
    >
      <button
        type="button"
        title="Set as merge survivor"
        aria-label={`Set ${name} as the merge survivor`}
        onClick={onTogglePrimary}
        className="shrink-0"
      >
        {isPrimary ? (
          <StarFill className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <Star className="size-4 text-foreground/40" aria-hidden="true" />
        )}
      </button>
      <RowCheckbox checked={isSelected} onChange={onToggleSelected} label={`Select ${name} for deletion`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="shrink-0 text-xs text-foreground/50">{new Date(lead.created_at).toLocaleDateString()}</p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
          {lead.phone_number ? <span className="font-mono">{lead.phone_number}</span> : null}
          {lead.age ? <span>Age {lead.age}</span> : null}
          {lead.marital_status ? (
            <Chip size="sm" variant="secondary">
              <Chip.Label>{lead.marital_status}</Chip.Label>
            </Chip>
          ) : null}
          {lead.sold ? (
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label>Sold</Chip.Label>
            </Chip>
          ) : null}
        </div>
      </div>
    </div>
  );
}

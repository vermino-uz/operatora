"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import { Target } from "@gravity-ui/icons";

import { leadSearchApi } from "@/services/api/leadSearch";

export interface LinkedLeadChipProps {
  linkedLeadId: string | null;
  onOpenDialog: () => void;
}

/** Header chip mirroring `ConversationDetailPanel.tsx`'s established
 * pattern (Phase 2c-12): shows the linked lead's name (resolved via the
 * real `lead-search` by-ids endpoint) or a "Link lead" button when none is
 * linked. Deliberately does not open a lead-details modal in place — this
 * app's `LeadDetailsModal` needs a `boardId`/`columns` context that can't
 * be resolved for an arbitrary chat's lead without a new board-resolving
 * lookup (same reasoning as the Tasks page's linked-lead display); clicking
 * "Link lead" opens `LinkLeadDialog`, which also links to the full Leads
 * page. */
export function LinkedLeadChip({ linkedLeadId, onOpenDialog }: LinkedLeadChipProps) {
  const leadQuery = useQuery({
    queryKey: ["lead-search-by-ids", linkedLeadId],
    queryFn: () => leadSearchApi.byIds([linkedLeadId as string]),
    enabled: Boolean(linkedLeadId),
    staleTime: 30_000,
  });

  if (!linkedLeadId) {
    return (
      <Button size="sm" variant="secondary" onPress={onOpenDialog}>
        <Target className="size-3.5" aria-hidden="true" />
        Link lead
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenDialog}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--default)] px-3 py-1 text-xs font-medium text-foreground hover:opacity-80"
    >
      <Target className="size-3.5" aria-hidden="true" />
      Lead: {leadQuery.data?.[0]?.name ?? "…"}
    </button>
  );
}

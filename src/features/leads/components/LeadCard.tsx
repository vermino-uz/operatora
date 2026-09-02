"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Avatar, Chip } from "@heroui/react";
import { Clock } from "@gravity-ui/icons";

import { formatLeadName, initials, isLeadOverdue, type LeadRow } from "@/features/leads/types";
import { intentLabel } from "@/features/leads/leadSignals";
import { CHANNEL_ICONS } from "@/features/leads/channelIcons";
import { RowCheckbox } from "@/features/leads/components/RowCheckbox";
import { CustomFieldValue } from "@/features/leads/components/CustomFieldValue";
import { ImageFieldThumbnails } from "@/features/leads/components/ImageFieldInput";
import { customFieldVisibilityKey, useCardFieldVisibilityQuery } from "@/features/leads/hooks/useFieldVisibility";

/** One kanban card — traced field-for-field against the old frontend's
 * `LeadCard.tsx` props (`first_name`/`last_name`/`phone_number`/`age`/
 * `deadline`/`custom_fields`/`connected_channels`). `connected_channels` is
 * real — `attachConnectedChannels()` overlays it onto every lead in the
 * column-leads response server-side (see `lead-channels-overlay.ts`), not
 * fabricated. Full parity (intent-score badges, inline sold/reject actions,
 * tag chips) is out of scope for this pass — see PROGRESS.md's deferred
 * list; this renders the "identify + open details" subset.
 *
 * `selected`/`onToggleSelect` (Phase 2c-3, both optional) add a row-select
 * checkbox for the shared bulk-actions toolbar — omitted entirely when the
 * card is rendered somewhere selection doesn't apply.
 *
 * `aiScore` (Phase 2c-11, optional) renders the real `buying_intent_score`
 * badge from `lead_signals` — only passed in by `KanbanColumn` while the
 * sort-by-AI-score toggle is on (see that component's doc comment for why
 * this isn't fetched unconditionally for every card). */
export function LeadCard({
  lead,
  onOpen,
  selected,
  onToggleSelect,
  aiScore,
}: {
  lead: LeadRow;
  onOpen: (lead: LeadRow) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  aiScore?: number | null;
}) {
  // `DragOverlay` (in `KanbanBoard`) is the only element that should track
  // the pointer during a drag — applying `useDraggable`'s own `transform`
  // to this node too would move a *second* copy of the card at the same
  // time (source node sliding via CSS transform + the portal-rendered
  // overlay clone following the cursor independently), which is what
  // produced the stutter/double-image glitch. The source node only needs
  // to dim in place to show where the drag started.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const assigneeName = lead.operators?.operator_name ?? null;
  const deadline = lead.deadline ? new Date(lead.deadline) : null;
  const isOverdue = isLeadOverdue(lead.deadline);
  const channels = lead.connected_channels ?? [];

  // Per-user Kanban-card custom-field visibility (Phase 2c-6) — shares the
  // same `['lead-field-visibility-bundle']` query cache across every
  // mounted card, so this fires once per board render, not once per card.
  const visibilityBundle = useCardFieldVisibilityQuery();
  const savedVisibility = visibilityBundle.data?.visibility ?? [];
  const hasSavedVisibility = savedVisibility.length > 0;
  const visibleCustomFields = (visibilityBundle.data?.customFields ?? []).filter((cf) => {
    const key = customFieldVisibilityKey(cf.field_name);
    const setting = savedVisibility.find((s) => s.field_name === key);
    return setting ? setting.is_visible : !hasSavedVisibility;
  });
  const imageFieldNames = useMemo(() => {
    const names = new Set<string>();
    for (const cf of visibilityBundle.data?.customFields ?? []) {
      if (cf.field_type === "image") names.add(cf.field_name);
    }
    return names;
  }, [visibilityBundle.data?.customFields]);

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(lead);
      }}
      className="cursor-grab select-none rounded-lg border border-black/[0.08] bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-white/[0.12]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {onToggleSelect ? (
            <RowCheckbox
              checked={Boolean(selected)}
              onChange={onToggleSelect}
              label={`Select ${formatLeadName(lead)}`}
            />
          ) : null}
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
        </span>
        {aiScore != null ? (
          <Chip size="sm" variant="soft" className="shrink-0" title="AI buying-intent score">
            {intentLabel(aiScore).emoji} {Math.round(aiScore * 100)}
          </Chip>
        ) : null}
        {channels.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1">
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel];
              return Icon ? (
                <Icon key={channel} className="size-3 text-foreground/40" aria-label={channel} />
              ) : null;
            })}
          </div>
        ) : null}
      </div>
      {lead.phone_number ? (
        <p className="mt-0.5 truncate font-mono text-xs text-foreground/60">{lead.phone_number}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        {assigneeName ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar size="sm" className="size-5 shrink-0">
              <Avatar.Fallback className="text-[9px]">{initials(assigneeName)}</Avatar.Fallback>
            </Avatar>
            <span className="truncate text-xs text-foreground/50">{assigneeName}</span>
          </span>
        ) : (
          <span className="text-xs text-foreground/30">Unassigned</span>
        )}
        {deadline ? (
          isOverdue ? (
            <Chip color="danger" size="sm" className="shrink-0">
              <Clock className="size-3" aria-hidden="true" />
              <Chip.Label>{deadline.toLocaleDateString()}</Chip.Label>
            </Chip>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-xs text-foreground/50">
              <Clock className="size-3" aria-hidden="true" />
              {deadline.toLocaleDateString()}
            </span>
          )
        ) : null}
      </div>
      {visibleCustomFields.length > 0 ? (
        <dl className="mt-2 flex flex-col gap-0.5 border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
          {visibleCustomFields.map((cf) => {
            const rawValue = (lead.custom_fields as Record<string, unknown> | null | undefined)?.[cf.field_name];
            if (imageFieldNames.has(cf.field_name)) {
              return (
                <div key={cf.id} className="flex min-w-0 items-baseline gap-1.5 text-xs">
                  <dt className="shrink-0 text-foreground/40">{cf.field_name}:</dt>
                  <dd className="min-w-0">
                    <ImageFieldThumbnails value={rawValue} size="sm" maxVisible={3} stopClickPropagation />
                  </dd>
                </div>
              );
            }
            return (
              <div key={cf.id} className="flex min-w-0 items-baseline gap-1.5 text-xs">
                <dt className="shrink-0 text-foreground/40">{cf.field_name}:</dt>
                <dd className="min-w-0 truncate text-foreground/70">
                  <CustomFieldValue def={cf} lead={lead} compact />
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </div>
  );
}

"use client";

import { Avatar, Button, Chip } from "@heroui/react";
import { Clock, Gear, Handset, Envelope as Mail, Persons, Star, Target } from "@gravity-ui/icons";

import type { OperatorOverviewRow } from "@/features/operators/types";

export interface OperatorMetrics {
  displayName: string;
  conversationsCount: number;
  conversions: number;
  avgScore: number;
  avgDuration: string;
  totalHours: number;
  active: boolean;
}

export function OperatorCard({
  operator,
  metrics,
  canEdit,
  onViewConversations,
  onEdit,
  onSendFeedback,
}: {
  operator: OperatorOverviewRow;
  metrics: OperatorMetrics;
  canEdit: boolean;
  onViewConversations: () => void;
  onEdit: () => void;
  onSendFeedback: () => void;
}) {
  const initials = metrics.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar size="md">
              {operator.avatar_url ? <Avatar.Image src={operator.avatar_url} alt="" /> : null}
              <Avatar.Fallback>{initials || "?"}</Avatar.Fallback>
            </Avatar>
            {metrics.active ? (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{metrics.displayName}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Chip size="sm" color={metrics.active ? "success" : "default"} variant="soft">
                <Chip.Label>{metrics.active ? "Active" : "Offline"}</Chip.Label>
              </Chip>
              {operator.internal_number ? (
                <Chip size="sm" variant="soft">
                  <Chip.Label>#{operator.internal_number}</Chip.Label>
                </Chip>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">{metrics.avgScore}</p>
          <p className="text-[11px] text-foreground/50">AI score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-center dark:bg-white/[0.05]">
          <Handset className="mx-auto mb-1 size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{metrics.conversationsCount}</p>
          <p className="text-[11px] text-foreground/50">Calls</p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-center dark:bg-white/[0.05]">
          <Target className="mx-auto mb-1 size-4 text-success" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{metrics.conversions}</p>
          <p className="text-[11px] text-foreground/50">Conversions</p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-center dark:bg-white/[0.05]">
          <Clock className="mx-auto mb-1 size-4 text-foreground/40" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{metrics.avgDuration}</p>
          <p className="text-[11px] text-foreground/50">Avg duration</p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-center dark:bg-white/[0.05]">
          <Star className="mx-auto mb-1 size-4 text-accent" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{metrics.totalHours}h</p>
          <p className="text-[11px] text-foreground/50">Total time</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-black/[0.06] pt-3 text-xs text-foreground/50 dark:border-white/[0.08]">
        <Mail className="size-3.5" aria-hidden="true" />
        <span className="truncate">{operator.email ?? "—"}</span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onPress={onViewConversations}>
          <Persons className="size-3.5" aria-hidden="true" />
          View calls
        </Button>
        {canEdit ? (
          <>
            <Button size="sm" variant="secondary" isIconOnly onPress={onEdit} aria-label="Edit operator">
              <Gear className="size-3.5" aria-hidden="true" />
            </Button>
            <Button size="sm" variant="secondary" isIconOnly onPress={onSendFeedback} aria-label="Send feedback">
              <Mail className="size-3.5" aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

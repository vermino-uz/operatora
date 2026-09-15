"use client";

import { useState } from "react";
import { Drawer, ListBox, Select } from "@heroui/react";
import {
  ChartColumn,
  CircleInfo,
  Comment,
  Envelope,
  Handset,
  ListCheck,
  ListTimeline,
} from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadDetailsQuery } from "@/features/leads/hooks/useLeadDetailsQuery";
import { useAssignOperatorMutation, useMoveLeadMutation } from "@/features/leads/hooks/useLeadMutations";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { formatLeadName, isLeadOverdue, type LeadBoardColumn, type LeadRow } from "@/features/leads/types";
import { CHANNEL_ICONS } from "@/features/leads/channelIcons";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { LeadAdditionalPhones } from "@/features/leads/components/LeadAdditionalPhones";
import { LeadCustomFieldsSection } from "@/features/leads/components/LeadCustomFieldsSection";
import { LeadCommentsTab } from "@/features/leads/components/LeadCommentsTab";
import { LeadTimelineTab } from "@/features/leads/components/LeadTimelineTab";
import { LeadTagsTab } from "@/features/leads/components/LeadTagsTab";
import { LeadConversationsTab } from "@/features/leads/components/LeadConversationsTab";
import { LeadSmsTab } from "@/features/leads/components/LeadSmsTab";
import { LeadTasksTab } from "@/features/leads/components/LeadTasksTab";
import { LeadStatsTab } from "@/features/leads/components/LeadStatsTab";
import { LeadChannelChatDialog } from "@/features/leads/components/LeadChannelChatDialog";
import type { LeadChatChannel } from "@/features/leads/hooks/useLeadChannelChat";

type DetailsTab = "info" | "comments" | "timeline" | "conversations" | "sms" | "tasks" | "stats";

const DEFAULT_COLUMN_COLOR = "#3b82f6";
const POPUP_CHANNELS = new Set<string>(["telegram", "instagram"]);

const DETAIL_TABS = [
  ["info", "Info", CircleInfo],
  ["comments", "Comments", Comment],
  ["timeline", "Timeline", ListTimeline],
  ["conversations", "Conversations", Handset],
  ["sms", "SMS", Envelope],
  ["tasks", "Tasks", ListCheck],
  ["stats", "Stats", ChartColumn],
] as const satisfies ReadonlyArray<[DetailsTab, string, typeof CircleInfo]>;

/**
 * Real (not stub) lead details view — HeroUI `Drawer` sliding in from the
 * right edge, now a tabbed panel (Phase 2c-4): Info (core fields, unchanged
 * from the Phase 2b MVP, plus additional phone numbers and tags — tags
 * folded in here rather than a separate tab, since `LeadTagsTab` is a thin
 * chip picker, not worth its own slot) + Comments/Timeline/Conversations/
 * SMS/Tasks/Stats, each its own component under
 * `features/leads/components/Lead*Tab.tsx`. Every non-Info tab is mounted
 * (and its data hook enabled) only while it's the selected tab — see the
 * `isActive` prop threaded into each — so opening the drawer never fires
 * eight tabs' worth of requests at once (same "fetch on demand, not on
 * mount" rule `useConversationAudio` established). Still explicitly NOT the
 * old frontend's 3,442-line `LeadDetailsDialog.tsx` — AI-assist/duplicate-
 * detection/relations/real-time call guidance stay out of scope, see
 * PROGRESS.md's Phase 2c slice list.
 */
export function LeadDetailsModal({
  boardId,
  columns,
  initialLead,
  onClose,
}: {
  boardId: string;
  columns: LeadBoardColumn[];
  initialLead: LeadRow;
  onClose: () => void;
}) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const currentUser = useSessionStore((s) => s.user);
  const operatorName = currentUser?.full_name || currentUser?.email || "Operator";
  const detailQuery = useLeadDetailsQuery(initialLead.id);
  const operatorsQuery = useTeamMembersQuery(workspaceId, {});
  const moveLead = useMoveLeadMutation(boardId);
  const assignOperator = useAssignOperatorMutation(boardId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailsTab>("info");
  const [openChannelChat, setOpenChannelChat] = useState<LeadChatChannel | null>(null);

  // Seed from the card's already-cached row so the modal never opens
  // blank; the fresh `GET /leads/:id` read replaces it once it resolves.
  const lead = detailQuery.data ?? initialLead;
  const deadlineDate = lead.deadline ? new Date(lead.deadline) : null;
  const isOverdue = isLeadOverdue(lead.deadline);
  const channels = lead.connected_channels ?? [];

  const handleMoveColumn = (columnId: string) => {
    setActionError(null);
    moveLead.mutate({ leadId: lead.id, columnId }, { onError: (err) => setActionError(leadActionErrorMessage(err, "move")) });
  };

  const handleReassign = (operatorId: string | null) => {
    setActionError(null);
    assignOperator.mutate({ leadId: lead.id, operatorId }, { onError: (err) => setActionError(leadActionErrorMessage(err)) });
  };

  return (
    <>
    <Drawer.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content placement="right">
        <Drawer.Dialog className="flex h-full max-h-[100dvh] !w-full max-w-2xl flex-col">
          <Drawer.CloseTrigger />
          <Drawer.Header className="shrink-0">
            <Drawer.Heading className="flex items-center gap-2">
              {formatLeadName(lead)}
              {channels.length > 0 ? (
                <span className="flex items-center gap-1">
                  {channels.map((channel) => {
                    const Icon = CHANNEL_ICONS[channel];
                    if (!Icon) return null;
                    if (!POPUP_CHANNELS.has(channel)) {
                      return <Icon key={channel} className="size-3.5 text-foreground/40" aria-label={channel} />;
                    }
                    return (
                      <button
                        key={channel}
                        type="button"
                        aria-label={`Open ${channel} chat`}
                        title={`Open ${channel} chat`}
                        onClick={() => setOpenChannelChat(channel as LeadChatChannel)}
                        className="text-foreground/40 hover:text-foreground"
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                      </button>
                    );
                  })}
                </span>
              ) : null}
            </Drawer.Heading>
          </Drawer.Header>
          <div
            role="tablist"
            aria-label="Lead details sections"
            className="flex shrink-0 flex-wrap items-stretch gap-x-3 gap-y-1 border-b border-black/[0.06] px-4 dark:border-white/10"
          >
            {DETAIL_TABS.map(([id, label, Icon]) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={label}
                  onClick={() => setTab(id)}
                  className={`group relative flex shrink-0 items-center py-3 text-xs font-medium transition-colors ${
                    isActive ? "text-accent" : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive
                        ? "ml-1.5 max-w-28 opacity-100"
                        : "ml-0 max-w-0 opacity-0 group-hover:ml-1.5 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-28 group-focus-visible:opacity-100"
                    }`}
                  >
                    {label}
                  </span>
                  {isActive ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" /> : null}
                </button>
              );
            })}
          </div>
          <Drawer.Body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
              <div className="flex flex-col gap-4">
              {detailQuery.isError ? <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} /> : null}
              {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}

              {tab !== "info" ? null : (
                <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-foreground/50">Phone</dt>
                <dd className="font-mono text-foreground">{lead.phone_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/50">Email</dt>
                <dd className="text-foreground">{lead.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/50">Created</dt>
                <dd className="text-foreground">{new Date(lead.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/50">Deadline</dt>
                <dd className={isOverdue ? "font-medium text-danger" : "text-foreground"}>
                  {deadlineDate ? deadlineDate.toLocaleString() : "—"}
                  {isOverdue ? " (overdue)" : ""}
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-1 text-xs text-foreground/50">Column</p>
              <Select
                aria-label="Column"
                value={lead.column_id}
                isDisabled={moveLead.isPending}
                onChange={(key) => {
                  if (typeof key === "string") handleMoveColumn(key);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={columns.map((c) => ({ id: c.id, label: c.name, color: c.color }))}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        <span
                          className="mr-2 inline-block size-2.5 shrink-0 rounded-full align-middle"
                          style={{ backgroundColor: opt.color ?? DEFAULT_COLUMN_COLOR }}
                          aria-hidden="true"
                        />
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-foreground/50">Assigned operator</p>
              <Select
                aria-label="Assigned operator"
                value={lead.assigned_operator_id ?? "unassigned"}
                isDisabled={assignOperator.isPending || operatorsQuery.isLoading}
                onChange={(key) => {
                  if (typeof key !== "string") return;
                  handleReassign(key === "unassigned" ? null : key);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox
                    items={[
                      { id: "unassigned", label: "Unassigned" },
                      ...(operatorsQuery.data ?? []).map((op) => ({
                        id: op.user_id,
                        label: op.full_name || op.email || op.user_id,
                      })),
                    ]}
                  >
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <LeadCustomFieldsSection lead={lead} />

                  <LeadAdditionalPhones leadId={lead.id} />

                  <div className="border-t border-black/[0.06] pt-4 dark:border-white/10">
                    <LeadTagsTab leadId={lead.id} isActive={tab === "info"} />
                  </div>

                  {detailQuery.isLoading ? <LoadingState label="Refreshing lead…" /> : null}
                </>
              )}

              {tab === "comments" ? <LeadCommentsTab leadId={lead.id} isActive={tab === "comments"} /> : null}
              {tab === "timeline" ? (
                <LeadTimelineTab leadId={lead.id} workspaceId={workspaceId} boardId={boardId} isActive={tab === "timeline"} />
              ) : null}
              {tab === "conversations" ? (
                <LeadConversationsTab leadId={lead.id} isActive={tab === "conversations"} />
              ) : null}
              {tab === "sms" ? (
                <LeadSmsTab leadId={lead.id} isActive={tab === "sms"} lead={lead} operatorName={operatorName} />
              ) : null}
              {tab === "tasks" ? <LeadTasksTab leadId={lead.id} isActive={tab === "tasks"} /> : null}
              {tab === "stats" ? (
                <LeadStatsTab leadId={lead.id} workspaceId={workspaceId} isActive={tab === "stats"} />
              ) : null}
              </div>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
    {openChannelChat ? (
      <LeadChannelChatDialog
        channel={openChannelChat}
        leadId={lead.id}
        leadPhone={lead.phone_number ?? null}
        onClose={() => setOpenChannelChat(null)}
      />
    ) : null}
    </>
  );
}

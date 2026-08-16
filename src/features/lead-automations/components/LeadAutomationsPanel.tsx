"use client";

import { useState, type ReactNode } from "react";
import { Button, Switch } from "@heroui/react";
import { ClockArrowRotateLeft, GearPlay, Pencil, Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useAllLeadsBoardColumnsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import {
  useAutomationOperatorsQuery,
  useAutomationRulesQuery,
  useDeleteAutomationRuleMutation,
  useLeadTagsQuery,
  useSaveAutomationRuleMutation,
  useToggleAutomationRuleMutation,
  useUnpauseAutomationRuleMutation,
} from "@/features/lead-automations/hooks/useLeadAutomations";
import {
  buildRulePayload,
  describeActions,
  describeTriggers,
  EMPTY_FORM,
  formFromRow,
  isPaused,
  pauseError,
  ruleMatchesBoard,
  type AutomationRuleRow,
  type FormState,
} from "@/features/lead-automations/types";
import { RuleFormModal } from "@/features/lead-automations/components/RuleFormModal";
import { RuleHistoryModal } from "@/features/lead-automations/components/RuleHistoryModal";

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage lead automations.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Lead Automations — workspace-wide rule engine (any board) by default:
 * trigger(s) → action(s), e.g. "lead sits in Hot for 2 days with no
 * follow-up → notify the assigned operator on Telegram". Traced from
 * `AutomationRulesSettings.tsx` → `LeadAutomationsPanel.tsx`
 * (`variant="settings" kind="automation"`) — see `types.ts` for the full
 * contract trace. Confirmed distinct from Departments' AI-escalation
 * routing (`features/departments/`, a single `routing_prompt` per
 * department) — this is a general condition/action rule builder over the
 * whole lead lifecycle, not escalation-only.
 *
 * `boardId`/`variant="dialog"` (Phase 2c-10) reuse this exact same
 * component/data layer for the per-board automations dialog opened from
 * `/leads` — same `automation_rules` table, same engine, just a client-side
 * `board_id` filter on the list and a `board_id` stamped onto new/edited
 * rules (see `ruleMatchesBoard`/`buildRulePayload` in `types.ts`), matching
 * the old frontend's own `LeadAutomationsPanel` `boardId`/`variant` props
 * exactly. When embedded in the Leads dialog the outer `Modal` already
 * supplies the title/chrome, so `variant="dialog"` skips
 * `SettingsSectionShell` and renders just the list + inline "New rule"
 * button.
 */
export function LeadAutomationsPanel({
  boardId = null,
  variant = "settings",
}: {
  boardId?: string | null;
  variant?: "settings" | "dialog";
}) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const rulesQuery = useAutomationRulesQuery(workspaceId);
  const { columns: allColumns } = useAllLeadsBoardColumnsQuery(workspaceId);
  const columns = boardId ? allColumns.filter((c) => c.board_id === boardId) : allColumns;
  const operatorsQuery = useAutomationOperatorsQuery(workspaceId);
  const tagsQuery = useLeadTagsQuery(workspaceId);
  const saveMutation = useSaveAutomationRuleMutation(workspaceId);
  const deleteMutation = useDeleteAutomationRuleMutation(workspaceId);
  const toggleMutation = useToggleAutomationRuleMutation(workspaceId);
  const unpauseMutation = useUnpauseAutomationRuleMutation(workspaceId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRuleRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM());
  const [historyRule, setHistoryRule] = useState<AutomationRuleRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM());
    setActionError(null);
    setModalOpen(true);
  }
  function openEdit(row: AutomationRuleRow) {
    setEditing(row);
    setForm(formFromRow(row));
    setActionError(null);
    setModalOpen(true);
  }

  async function save() {
    if (saveMutation.isPending || !workspaceId) return; // guard double-submit
    setActionError(null);
    try {
      await saveMutation.mutateAsync({ id: editing?.id ?? null, payload: buildRulePayload(form, workspaceId, boardId) });
      setModalOpen(false);
    } catch (err) {
      setActionError(mutationErrorMessage(err));
    }
  }

  async function remove(row: AutomationRuleRow) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setPendingDeleteId(row.id);
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(row.id);
    } catch (err) {
      setActionError(mutationErrorMessage(err));
    } finally {
      setPendingDeleteId(null);
    }
  }

  const shellProps = {
    title: "Lead Automations",
    subtitle: "AI signal and pipeline triggers — auto-move hot leads or assign them to an operator.",
    wide: true,
    actions: workspaceId ? (
      <Button size="sm" onPress={openCreate}>
        <Plus className="size-3.5" />
        New rule
      </Button>
    ) : undefined,
  } as const;

  // `variant="dialog"` is embedded inside `LeadBoardAutomationsDialog`'s own
  // `Modal` (title/description already rendered there), so it skips
  // `SettingsSectionShell`'s card chrome and just renders an inline "New
  // rule" button above the list instead of a header action. `renderShell`
  // is a plain function (not a component) so it can't trip the
  // components-created-during-render lint rule.
  function renderShell(children: ReactNode) {
    return variant === "dialog" ? (
      <div className="space-y-3">
        {workspaceId ? (
          <div className="flex justify-end">
            <Button size="sm" onPress={openCreate}>
              <Plus className="size-3.5" />
              New rule
            </Button>
          </div>
        ) : null}
        {children}
      </div>
    ) : (
      <SettingsSectionShell {...shellProps}>{children}</SettingsSectionShell>
    );
  }

  if (!workspaceId) {
    return renderShell(<ErrorState error={new Error("No workspace selected")} />);
  }

  if (rulesQuery.isLoading) {
    return renderShell(<LoadingState label="Loading automation rules…" className="py-16" />);
  }

  if (rulesQuery.isError) {
    return renderShell(
      <ErrorState error={rulesQuery.error} onRetry={() => rulesQuery.refetch()} className="py-16" />,
    );
  }

  const rules = (rulesQuery.data ?? []).filter((row) => ruleMatchesBoard(row, boardId));
  const operators = operatorsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  return renderShell(
    <>
      {actionError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <EmptyState
          title="No automation rules yet"
          description="Add a rule to auto-move, assign, or notify on lead events."
          action={
            <Button size="sm" className="mt-2" onPress={openCreate}>
              Add your first rule
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
          {rules.map((row) => {
            const paused = isPaused(row);
            const error = pauseError(row);
            return (
              <li key={row.id} className="flex items-start gap-4 px-4 py-3.5">
                <GearPlay className="mt-0.5 size-4 shrink-0 text-foreground/30" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{row.name}</span>
                    {paused ? (
                      <span className="text-xs font-medium tracking-wide text-warning uppercase">paused — error</span>
                    ) : !row.is_active ? (
                      <span className="text-xs tracking-wide text-foreground/40 uppercase">off</span>
                    ) : null}
                  </div>
                  {row.description ? <p className="mt-0.5 text-xs text-foreground/50">{row.description}</p> : null}
                  {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
                  <p className="mt-1.5 text-sm text-foreground/70">
                    <span className="font-medium text-foreground">When:</span> {describeTriggers(row, columns)}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/70">
                    <span className="font-medium text-foreground">Then:</span> {describeActions(row, columns, operators)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {paused ? (
                    <Button size="sm" variant="secondary" isDisabled={unpauseMutation.isPending} onPress={() => unpauseMutation.mutate(row)}>
                      Unpause
                    </Button>
                  ) : (
                    <Switch
                      isSelected={row.is_active}
                      onChange={(isActive) => toggleMutation.mutate({ id: row.id, isActive })}
                      aria-label={`${row.name} active`}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  )}
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" isIconOnly aria-label="History" onPress={() => setHistoryRule(row)}>
                      <ClockArrowRotateLeft className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" isIconOnly aria-label="Edit" onPress={() => openEdit(row)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" isIconOnly aria-label="Delete" isDisabled={pendingDeleteId === row.id} onPress={() => void remove(row)}>
                      <TrashBin className="size-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RuleFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        columns={columns}
        operators={operators}
        tags={tags}
        isEditing={!!editing}
        isSaving={saveMutation.isPending}
        onSave={() => void save()}
      />
      <RuleHistoryModal rule={historyRule} onClose={() => setHistoryRule(null)} />
    </>,
  );
}

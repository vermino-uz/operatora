"use client";

import { useState } from "react";
import { Button, Switch } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useAllLeadsBoardColumnsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { useTaskModuleSettingsQuery, useUpdateTaskModuleSettingsMutation } from "@/features/tasks-settings/hooks/useTaskModuleSettings";
import { createEmptyTaskRule, type TaskModuleSettings, type TaskRule } from "@/features/tasks-settings/types";
import { TaskRuleCard } from "@/features/tasks-settings/components/TaskRuleCard";

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only workspace managers can update task automation settings.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return "Couldn't save task settings.";
}

/**
 * Task Management — `GET/PUT /tasks/settings`. Not autosave: matches the
 * old frontend's explicit Save button + dirty-tracking (`useState` diffed
 * against a saved-snapshot string), since these rules affect every
 * operator's daily workflow and shouldn't change mid-edit.
 */
export function TaskModuleSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const settingsQuery = useTaskModuleSettingsQuery();
  const updateMutation = useUpdateTaskModuleSettingsMutation();
  const { columns, isLoading: columnsLoading } = useAllLeadsBoardColumnsQuery(workspaceId);

  const [draft, setDraft] = useState<TaskModuleSettings>({ enabled: false, rules: [] });
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify({ enabled: false, rules: [] }));
  const [saveError, setSaveError] = useState<string | null>(null);

  // Render-time "adjust state on prop change" (same pattern as
  // `EditMemberModal`'s tab reset) — syncs the local draft whenever the
  // query settles with fresh data (initial load, refetch, or a
  // successful save via `setQueryData`), never via a `useEffect`.
  const loadedKey = settingsQuery.dataUpdatedAt ? String(settingsQuery.dataUpdatedAt) : null;
  const [trackedLoadedKey, setTrackedLoadedKey] = useState<string | null>(null);
  if (loadedKey && loadedKey !== trackedLoadedKey && settingsQuery.data) {
    setTrackedLoadedKey(loadedKey);
    setDraft(settingsQuery.data);
    setSavedSnapshot(JSON.stringify(settingsQuery.data));
  }

  const dirty = JSON.stringify(draft) !== savedSnapshot;

  function patchRule(id: string, patch: Partial<TaskRule>) {
    setDraft((prev) => ({ ...prev, rules: prev.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }
  function removeRule(id: string) {
    setDraft((prev) => ({ ...prev, rules: prev.rules.filter((r) => r.id !== id) }));
  }
  function addRule() {
    setDraft((prev) => ({ ...prev, rules: [...prev.rules, createEmptyTaskRule({ name: `Rule ${prev.rules.length + 1}` })] }));
  }

  async function save() {
    if (updateMutation.isPending) return; // guard double-submit
    setSaveError(null);
    try {
      await updateMutation.mutateAsync(draft);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    }
  }

  const shellProps = {
    title: "Task Management",
    subtitle: "Enable the tasks module and configure when operators are prompted to create follow-up tasks.",
    actions: (
      <Button size="sm" isDisabled={!dirty || updateMutation.isPending} onPress={() => void save()}>
        {updateMutation.isPending ? "Saving…" : "Save changes"}
      </Button>
    ),
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading task settings…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <div>
            <p className="text-sm font-medium">Enable the tasks module</p>
            <p className="mt-0.5 text-xs text-foreground/50">When off, no automation rules run and operators aren&apos;t prompted for follow-up tasks.</p>
          </div>
          <Switch isSelected={draft.enabled} onChange={(enabled) => setDraft((p) => ({ ...p, enabled }))} aria-label="Enable tasks module">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>

        {draft.enabled ? (
          <div className="space-y-4 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Rules</p>
                <p className="mt-0.5 text-xs text-foreground/50">Each rule fires when its trigger happens, per the scoped columns (if any).</p>
              </div>
              <Button size="sm" variant="secondary" onPress={addRule}>
                <Plus className="size-3.5" />
                Add rule
              </Button>
            </div>

            {draft.rules.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/[0.1] p-4 text-center text-sm text-foreground/50 dark:border-white/[0.15]">
                No rules yet — add one to start prompting operators for follow-up tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {draft.rules.map((rule, idx) => (
                  <TaskRuleCard
                    key={rule.id}
                    rule={rule}
                    index={idx}
                    columns={columnsLoading ? [] : columns}
                    onChange={(patch) => patchRule(rule.id, patch)}
                    onDelete={() => removeRule(rule.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
      </div>
    </SettingsSectionShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Tabs } from "@heroui/react";
import { Alarm, Calendar, CircleCheck, ListCheck, Plus, ArrowRotateRight } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { useTaskModuleSettingsQuery } from "@/features/tasks-settings/hooks/useTaskModuleSettings";
import { canManageTeamTasks } from "@/features/tasks/permissions";
import { useTasksQuery } from "@/features/tasks/hooks/useTasksQuery";
import { bucketTask, type OperatorTask, type TaskBucket, type TaskScope } from "@/features/tasks/types";
import { TaskRow } from "@/features/tasks/components/TaskRow";
import { TaskStatCard } from "@/features/tasks/components/TaskStatCard";
import { CreateTaskDialog } from "@/features/tasks/components/CreateTaskDialog";
import { TaskDetailsDialog } from "@/features/tasks/components/TaskDetailsDialog";
import { CompleteTaskDialog } from "@/features/tasks/components/CompleteTaskDialog";

type TabKey = "all" | TaskBucket;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

/**
 * Standalone Tasks app page (`/tasks`) — the real `operator_tasks` list
 * operators work from day to day, distinct from Settings > Tasks (the
 * automation-rules config for *when* the app should prompt/require/auto-
 * create a task, `features/tasks-settings/`). Reference: old frontend's
 * `pages/Tasks.tsx`.
 *
 * Not built here (real, traced, but out of scope for this slice — see
 * PROGRESS.md's Tasks page writeup for the full reasoning):
 * - Deep-linking a task's lead into `/leads`'s `LeadDetailsModal` — that
 *   modal requires a `boardId`/`columns` context this page has no way to
 *   resolve for an arbitrary lead id without a new board-resolving lookup;
 *   the linked lead instead renders as plain, non-interactive text.
 * - `applyColumnChangeTaskRules`/`applyLeadCreatedTaskRules`-equivalent
 *   auto-create/prompt wiring into the Leads feature (the old frontend's
 *   `lib/applyTaskRules.ts`) — that's Leads-feature integration work
 *   (triggered from lead column-change/create/assign events), not part of
 *   this standalone list page; `/leads` doesn't call it today.
 * - Task edit/cancel/delete — no such endpoint exists on `tasks.controller.ts`
 *   (only create, list, `PATCH :id/complete`, `GET assignees`), confirmed
 *   directly in the backend source, not assumed.
 */
export default function TasksPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const globalRoles = useSessionStore((s) => s.roles);

  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const moduleSettingsQuery = useTaskModuleSettingsQuery();

  const [scope, setScope] = useState<TaskScope>("mine");
  const [tab, setTab] = useState<TabKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsTask, setDetailsTask] = useState<OperatorTask | null>(null);
  const [completingTask, setCompletingTask] = useState<OperatorTask | null>(null);

  const canManage = canManageTeamTasks(globalRoles, permissionsQuery.data?.workspace_role);

  const tasksQuery = useTasksQuery(scope);

  const grouped = useMemo(() => {
    const overdue: OperatorTask[] = [];
    const today: OperatorTask[] = [];
    const upcoming: OperatorTask[] = [];
    const completed: OperatorTask[] = [];

    for (const task of tasksQuery.data ?? []) {
      const bucket = bucketTask(task);
      if (bucket === "overdue") overdue.push(task);
      else if (bucket === "today") today.push(task);
      else if (bucket === "upcoming") upcoming.push(task);
      else completed.push(task);
    }

    const byDue = (a: OperatorTask, b: OperatorTask) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    overdue.sort(byDue);
    today.sort(byDue);
    upcoming.sort(byDue);
    completed.sort(
      (a, b) => new Date(b.completed_at ?? b.updated_at).getTime() - new Date(a.completed_at ?? a.updated_at).getTime(),
    );

    return { overdue, today, upcoming, completed };
  }, [tasksQuery.data]);

  const visibleTasks = useMemo(() => {
    if (tab === "all") return [...grouped.overdue, ...grouped.today, ...grouped.upcoming];
    return grouped[tab];
  }, [tab, grouped]);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No workspace selected" description="Sign in to a workspace to view tasks." />
      </div>
    );
  }

  if (moduleSettingsQuery.isLoading) return <LoadingState label="Loading tasks…" />;
  if (moduleSettingsQuery.isError) {
    return <ErrorState error={moduleSettingsQuery.error} onRetry={() => moduleSettingsQuery.refetch()} />;
  }

  if (!moduleSettingsQuery.data?.enabled) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="Task management isn't enabled"
          description="Ask a workspace manager to enable the Tasks module in Settings before you can create or track tasks here."
          action={
            canManage ? (
              <Link href="/settings?section=tasks">
                <Button variant="primary" size="sm">
                  Open settings
                </Button>
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-foreground/60">Follow-ups and reminders tied to your day-to-day work.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button variant={scope === "team" ? "primary" : "secondary"} size="sm" onPress={() => setScope(scope === "team" ? "mine" : "team")}>
              {scope === "team" ? "My tasks" : "Team tasks"}
            </Button>
          ) : null}
          <Button variant="primary" size="sm" onPress={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={tasksQuery.isFetching}
            onPress={() => tasksQuery.refetch()}
          >
            <ArrowRotateRight className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <LoadingState label="Loading tasks…" />
      ) : tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TaskStatCard label="Overdue" value={grouped.overdue.length} tone="danger" icon={Alarm} />
            <TaskStatCard label="Today" value={grouped.today.length} tone="accent" icon={ListCheck} />
            <TaskStatCard label="Upcoming" value={grouped.upcoming.length} icon={Calendar} />
            <TaskStatCard label="Completed" value={grouped.completed.length} icon={CircleCheck} />
          </div>

          <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabKey)}>
            <Tabs.List>
              {TABS.map((t) => (
                <Tabs.Tab key={t.key} id={t.key}>
                  {t.label}
                  {t.key !== "all" && t.key !== "completed" ? ` (${grouped[t.key].length})` : ""}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          {visibleTasks.length === 0 ? (
            <EmptyState
              title={tab === "completed" ? "No completed tasks yet" : "No tasks here"}
              description={tab === "completed" ? undefined : "Create a task to get started."}
              action={
                tab !== "completed" ? (
                  <Button variant="primary" size="sm" onPress={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New task
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-2 pb-6">
              {visibleTasks.map((task) => (
                <TaskRow key={task.id} task={task} onComplete={setCompletingTask} onOpenDetails={setDetailsTask} />
              ))}
            </div>
          )}
        </div>
      )}

      {createOpen ? (
        <CreateTaskDialog
          canAssign={canManage}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
          }}
        />
      ) : null}

      {detailsTask ? (
        <TaskDetailsDialog
          task={detailsTask}
          onClose={() => setDetailsTask(null)}
          onComplete={(task) => setCompletingTask(task)}
        />
      ) : null}

      {completingTask ? (
        <CompleteTaskDialog task={completingTask} onClose={() => setCompletingTask(null)} />
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Pencil, Persons, Plus, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { useCoursesQuery, useDeleteGroupMutation, useGroupsQuery, useGroupUsersQuery } from "@/features/finance/hooks/useFinance";
import { canManageFinanceStructure } from "@/features/finance/permissions";
import { GroupEditorModal } from "@/features/finance/components/GroupEditorModal";
import { GroupMembersModal } from "@/features/finance/components/GroupMembersModal";
import type { GroupRow } from "@/features/finance/types";
import type { AppRole } from "@/types/entities";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to delete groups.";
    return error.message;
  }
  return "Couldn't delete this group.";
}

export function GroupsTab({ workspaceId, userId, roles }: { workspaceId: string; userId: string | null; roles: AppRole[] }) {
  const canManage = canManageFinanceStructure(roles);
  const groupsQuery = useGroupsQuery(workspaceId);
  const coursesQuery = useCoursesQuery(workspaceId);
  const deleteMutation = useDeleteGroupMutation(workspaceId);

  const groups = groupsQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const membersQuery = useGroupUsersQuery(groups.map((g) => g.id));
  const memberCountByGroup = new Map<string, number>();
  for (const gu of membersQuery.data ?? []) {
    if (gu.status !== "active") continue;
    memberCountByGroup.set(gu.group_id, (memberCountByGroup.get(gu.group_id) ?? 0) + 1);
  }

  const editorState = useOverlayState();
  const membersState = useOverlayState();
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [viewingMembers, setViewingMembers] = useState<GroupRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    editorState.open();
  }
  function openEdit(group: GroupRow) {
    setEditing(group);
    editorState.open();
  }
  function openMembers(group: GroupRow) {
    setViewingMembers(group);
    membersState.open();
  }

  async function remove(group: GroupRow) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(group.id);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    }
  }

  if (groupsQuery.isLoading || coursesQuery.isLoading) return <LoadingState label="Loading groups…" className="py-16" />;
  if (groupsQuery.isError) return <ErrorState error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} className="py-16" />;
  if (coursesQuery.isError) return <ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} className="py-16" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/60">Groups of students enrolled under a course.</p>
        {canManage ? (
          <Button size="sm" variant="primary" onPress={openCreate} isDisabled={courses.length === 0}>
            <Plus className="size-3.5" />
            New group
          </Button>
        ) : null}
      </div>

      {courses.length === 0 && canManage ? (
        <p className="text-sm text-foreground/60">Create a course first, under the Courses tab, before creating a group.</p>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Create a group under a course to start enrolling clients."
          action={
            canManage && courses.length > 0 ? (
              <Button size="sm" className="mt-2" onPress={openCreate}>
                Create your first group
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Name</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Course</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Members</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Due day</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Status</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b border-divider/60">
                  <td className="px-3 py-3 align-top text-sm font-medium text-foreground">{group.name}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{courseById.get(group.course_id)?.name ?? "—"}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{memberCountByGroup.get(group.id) ?? 0}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{group.monthly_due_day}</td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        group.is_active ? "bg-success/15 text-success" : "bg-foreground/10 text-foreground/70"
                      }`}
                    >
                      {group.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onPress={() => openMembers(group)}>
                        <Persons className="size-3.5" />
                        Members
                      </Button>
                      {canManage ? (
                        <>
                          <Button size="sm" variant="ghost" onPress={() => openEdit(group)} aria-label="Edit group">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onPress={() => void remove(group)} aria-label="Delete group">
                            <TrashBin className="size-3.5" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteError ? (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {canManage ? (
        <GroupEditorModal workspaceId={workspaceId} createdBy={userId} courses={courses} state={editorState} editing={editing} />
      ) : null}
      <GroupMembersModal workspaceId={workspaceId} group={viewingMembers} canManage={canManage} state={membersState} />
    </div>
  );
}

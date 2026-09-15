"use client";

import { useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Pencil, Plus, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { formatUZS } from "@/features/finance/utils";
import { useCoursesQuery, useDeleteCourseMutation } from "@/features/finance/hooks/useFinance";
import { canManageFinanceStructure } from "@/features/finance/permissions";
import { CourseEditorModal } from "@/features/finance/components/CourseEditorModal";
import type { CourseRow } from "@/features/finance/types";
import type { AppRole } from "@/types/entities";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to delete courses.";
    return error.message;
  }
  return "Couldn't delete this course.";
}

export function CoursesTab({ workspaceId, userId, roles }: { workspaceId: string; userId: string | null; roles: AppRole[] }) {
  const canManage = canManageFinanceStructure(roles);
  const coursesQuery = useCoursesQuery(workspaceId);
  const deleteMutation = useDeleteCourseMutation(workspaceId);

  const editorState = useOverlayState();
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    editorState.open();
  }
  function openEdit(course: CourseRow) {
    setEditing(course);
    editorState.open();
  }

  async function remove(course: CourseRow) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(course.id);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    }
  }

  if (coursesQuery.isLoading) return <LoadingState label="Loading courses…" className="py-16" />;
  if (coursesQuery.isError) return <ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} className="py-16" />;

  const courses = coursesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/60">Course catalog with monthly tuition rates.</p>
        {canManage ? (
          <Button size="sm" variant="primary" onPress={openCreate}>
            <Plus className="size-3.5" />
            New course
          </Button>
        ) : null}
      </div>

      {deleteError ? (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Add a course to start creating groups of students under it."
          action={
            canManage ? (
              <Button size="sm" className="mt-2" onPress={openCreate}>
                Create your first course
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
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Monthly tuition</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Status</th>
                {canManage ? <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-b border-divider/60">
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm font-medium text-foreground">{course.name}</p>
                    {course.description ? <p className="text-xs text-foreground/60">{course.description}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{formatUZS(course.monthly_tuition)}</td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        course.is_active ? "bg-success/15 text-success" : "bg-foreground/10 text-foreground/70"
                      }`}
                    >
                      {course.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canManage ? (
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onPress={() => openEdit(course)} aria-label="Edit course">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onPress={() => void remove(course)} aria-label="Delete course">
                          <TrashBin className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <CourseEditorModal workspaceId={workspaceId} createdBy={userId} state={editorState} editing={editing} />
      ) : null}
    </div>
  );
}

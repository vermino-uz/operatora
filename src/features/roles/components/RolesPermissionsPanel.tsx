"use client";

import { useState } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  type PermissionAction,
  type PermissionMatrix,
  type PermissionModule,
} from "@/features/roles/types";
import { useMyWorkspacePermissionsQuery, useWorkspaceRolesQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { useRolePermissionsQuery } from "@/features/roles/hooks/useRolePermissionsQuery";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useSetRolePermissionsMutation,
} from "@/features/roles/hooks/useRoleMutations";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage roles.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Roles & Permissions — `GET/POST/DELETE /workspace-rbac/roles`,
 * `GET/PUT /workspace-rbac/roles/:id/permissions`. Also the place this pass
 * wires real `workspace_users`-backed role data client-side for the first
 * time (`GET /workspace-rbac/me`, shown as a "Your access" summary) — see
 * PROGRESS.md for what's in scope here vs. deferred (global nav-level
 * `requiresPage`/`canViewPage` gating stays cosmetic-only, a larger
 * cross-cutting change).
 */
export function RolesPermissionsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const rolesQuery = useWorkspaceRolesQuery(workspaceId);
  const myPermissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = rolesQuery.data ?? [];
  // Falls back to the first role whenever nothing has been explicitly
  // selected yet (or the previously-selected role was just deleted) —
  // derived at render time, no separate sync effect needed.
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null;

  const permissionsQuery = useRolePermissionsQuery(workspaceId, selectedRole?.id ?? null);

  // Render-time state adjustment (not an effect) mirrors this repo's
  // established pattern (`useConversationAudio`) for resetting local edit
  // state when the loaded server value changes, satisfying the
  // `react-hooks/set-state-in-effect` lint rule.
  const [lastLoadedFor, setLastLoadedFor] = useState<string | null>(null);
  if (permissionsQuery.data && lastLoadedFor !== (selectedRole?.id ?? null)) {
    setMatrix(permissionsQuery.data);
    setDirty(false);
    setLastLoadedFor(selectedRole?.id ?? null);
  }

  const createRole = useCreateRoleMutation(workspaceId);
  const deleteRole = useDeleteRoleMutation(workspaceId);
  const setPermissions = useSetRolePermissionsMutation(workspaceId);

  const shellProps = {
    title: "Roles & Permissions",
    subtitle: "Define roles and control access with a permission matrix.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  const toggleCell = (mod: PermissionModule, action: PermissionAction) => {
    if (!matrix) return;
    setMatrix({ ...matrix, [mod]: { ...matrix[mod], [action]: !matrix[mod][action] } });
    setDirty(true);
  };

  const toggleRow = (mod: PermissionModule, value: boolean) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      [mod]: PERMISSION_ACTIONS.reduce(
        (acc, action) => {
          acc[action] = value;
          return acc;
        },
        {} as Record<PermissionAction, boolean>,
      ),
    });
    setDirty(true);
  };

  const handleCreateRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    setError(null);
    try {
      const role = await createRole.mutateAsync(name);
      setNewRoleName("");
      setSelectedRoleId(role.id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setError(null);
    try {
      await deleteRole.mutateAsync(roleId);
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!selectedRole || !matrix || setPermissions.isPending) return;
    setError(null);
    try {
      await setPermissions.mutateAsync({ roleId: selectedRole.id, matrix });
      setDirty(false);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  };

  return (
    <SettingsSectionShell {...shellProps} wide>
      {myPermissionsQuery.data ? (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 dark:border-white/[0.12] dark:bg-white/[0.03]">
          <span className="text-sm text-foreground/60">Your access in this workspace:</span>
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>{myPermissionsQuery.data.workspace_role}</Chip.Label>
          </Chip>
          {myPermissionsQuery.data.scopes.view_all_leads ? (
            <span className="text-xs text-foreground/50">Can view all workspace leads</span>
          ) : null}
        </div>
      ) : null}

      {rolesQuery.isLoading ? (
        <LoadingState label="Loading roles…" className="py-16" />
      ) : rolesQuery.isError ? (
        <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} className="py-16" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
            <div className="flex items-center gap-2 border-b border-black/[0.08] p-3 dark:border-white/[0.12]">
              <Input
                aria-label="New role name"
                placeholder="New role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                isDisabled={!newRoleName.trim() || createRole.isPending}
                onPress={handleCreateRole}
                aria-label="Add role"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-1.5">
              {roles.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-foreground/50">No roles yet.</p>
              ) : (
                roles.map((role) => (
                  <div
                    key={role.id}
                    className={`group flex items-center gap-1 rounded-lg px-1 ${
                      selectedRole?.id === role.id ? "bg-black/[0.05] dark:bg-white/[0.08]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm text-foreground"
                    >
                      {role.name}
                      {role.system_key ? (
                        <span className="ml-2 text-xs text-foreground/40">System</span>
                      ) : null}
                    </button>
                    {!role.system_key ? (
                      <button
                        type="button"
                        aria-label={`Delete ${role.name}`}
                        onClick={() => handleDeleteRole(role.id)}
                        className="shrink-0 rounded p-1.5 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                      >
                        <TrashBin className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
            {!selectedRole ? (
              <EmptyState title="Select a role to edit its permissions" className="py-10" />
            ) : permissionsQuery.isLoading || !matrix ? (
              <LoadingState label="Loading permissions…" className="py-10" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.08] dark:border-white/[0.12]">
                        <th className="py-2 pr-3 pl-1 text-left text-xs font-medium text-foreground/50">Module</th>
                        {PERMISSION_ACTIONS.map((action) => (
                          <th key={action} className="w-[88px] py-2 text-center text-xs font-medium text-foreground/50">
                            {PERMISSION_ACTION_LABELS[action]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.map((mod) => {
                        const allOn = PERMISSION_ACTIONS.every((a) => matrix[mod]?.[a]);
                        return (
                          <tr key={mod} className="border-b border-black/[0.05] last:border-b-0 dark:border-white/[0.06]">
                            <td className="py-2 pr-3 pl-1">
                              <button
                                type="button"
                                onClick={() => toggleRow(mod, !allOn)}
                                className="text-left text-sm font-medium text-foreground hover:text-accent"
                              >
                                {PERMISSION_MODULE_LABELS[mod]}
                              </button>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => (
                              <td key={action} className="text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`${PERMISSION_MODULE_LABELS[mod]} — ${PERMISSION_ACTION_LABELS[action]}`}
                                  checked={Boolean(matrix[mod]?.[action])}
                                  onChange={() => toggleCell(mod, action)}
                                  className="size-4 cursor-pointer accent-current"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {error ? (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    {error}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    isDisabled={!dirty}
                    onPress={() => {
                      if (permissionsQuery.data) setMatrix(permissionsQuery.data);
                      setDirty(false);
                    }}
                  >
                    Discard
                  </Button>
                  <Button variant="primary" size="sm" isDisabled={!dirty || setPermissions.isPending} onPress={handleSave}>
                    {setPermissions.isPending ? "Saving…" : "Save permissions"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </SettingsSectionShell>
  );
}

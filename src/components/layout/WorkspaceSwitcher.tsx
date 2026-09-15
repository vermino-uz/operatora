"use client";

import { Select, ListBox } from "@heroui/react";
import { Briefcase } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { useWorkspaceSettingsQuery } from "@/features/settings/hooks/useWorkspaceSettingsQuery";

/**
 * Workspace switcher for users with multiple `workspace_users` memberships.
 *
 * Backend reality check (confirmed against `auth.service.ts`'s
 * `getWorkspaceId()`/`resolveAccessContext()` and the live
 * `test.operatora.ai` deployment, not just the Prisma schema): a user's
 * session (`/api/auth/login`, `/api/auth/me`) only ever carries ONE
 * resolved `workspaceId` — the earliest-created `workspace_users` row —
 * and there is currently no `GET /workspaces/mine`-style endpoint (or
 * equivalent) that lists every workspace a user belongs to. Multiple
 * `workspace_users` rows for one user CAN exist in the data (e.g. a
 * platform admin adding an existing user to another workspace via
 * `admin-users.service.ts`), but nothing server-side exposes that list to
 * the owning user, and no endpoint accepts a "switch active workspace"
 * request the way `/auth/switch` does for linked accounts.
 *
 * Given that backend gap (flagged for a follow-up backend change — not
 * something to fake client-side), this renders as a read-only "current
 * workspace" indicator today. It is still wired through the same
 * Zustand `workspaceId` slot (`useSessionStore`) that a real multi-entry
 * switcher would use, and swaps to an interactive `Select` the moment
 * `workspaces.length > 1` — so no further rewiring is needed once a
 * "list my workspaces" endpoint exists; only the `workspaces` array below
 * needs to be sourced from it instead of the single known id.
 */
export function WorkspaceSwitcher({ expanded }: { expanded: boolean }) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const setWorkspaceId = useSessionStore((s) => s.setWorkspaceId);
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);

  if (!workspaceId) return null;

  const currentName = settingsQuery.data?.workspace_name?.trim() || "Workspace";
  // Only ever one entry today (see backend-gap note above) — the shape is
  // deliberately an array so this is a no-op change point once a real
  // "my workspaces" list is available.
  const workspaces = [{ id: workspaceId, name: currentName }];

  if (!expanded) return null;

  if (workspaces.length <= 1) {
    return (
      <div
        className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-sm text-foreground/80"
        data-testid="workspace-switcher-static"
      >
        <Briefcase className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{currentName}</span>
      </div>
    );
  }

  return (
    <Select
      aria-label="Active workspace"
      value={workspaceId}
      onChange={(key) => typeof key === "string" && setWorkspaceId(key)}
      data-testid="workspace-switcher"
    >
      <Select.Trigger className="w-full">
        <Briefcase className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={workspaces.map((w) => ({ id: w.id, label: w.name }))}>
          {(item) => (
            <ListBox.Item id={item.id} textValue={item.label}>
              {item.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

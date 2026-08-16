/**
 * Roles & Permissions — traced from the old frontend's `RolesPermissions.tsx`
 * against the real backend `settings-controller/workspace-rbac/*`
 * (`/workspace-rbac/*`). Three system roles (Owner/Manager/Sales Operator)
 * are auto-seeded per workspace server-side; custom roles can be added.
 */
export interface WorkspaceRole {
  id: string;
  name: string;
  system_key: string | null;
  created_at: string;
}

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "manage";

export type PermissionModule =
  | "dashboard"
  | "leads"
  | "conversations"
  | "messages"
  | "telegram"
  | "instagram"
  | "telephony"
  | "ads"
  | "ai_dashboards"
  | "settings"
  | "agent_settings"
  | "billing";

export type PermissionMatrix = Record<PermissionModule, Record<PermissionAction, boolean>>;

export const PERMISSION_MODULES: PermissionModule[] = [
  "dashboard",
  "leads",
  "conversations",
  "messages",
  "telegram",
  "instagram",
  "telephony",
  "ads",
  "ai_dashboards",
  "settings",
  "agent_settings",
  "billing",
];

export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "export", "manage"];

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  conversations: "Conversations",
  messages: "Messages",
  telegram: "Telegram",
  instagram: "Instagram",
  telephony: "Telephony",
  ads: "Ads",
  ai_dashboards: "AI Dashboards",
  settings: "Settings",
  agent_settings: "Agent Settings",
  billing: "Billing",
};

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
  manage: "Manage",
};

export interface EffectiveWorkspacePermissions {
  user_id: string;
  workspace_id: string;
  workspace_role: string;
  role_ids: string[];
  matrix: PermissionMatrix;
  scopes: { view_all_leads: boolean };
}

export function emptyPermissionMatrix(): PermissionMatrix {
  return PERMISSION_MODULES.reduce((acc, mod) => {
    acc[mod] = PERMISSION_ACTIONS.reduce(
      (a, act) => {
        a[act] = false;
        return a;
      },
      {} as Record<PermissionAction, boolean>,
    );
    return acc;
  }, {} as PermissionMatrix);
}

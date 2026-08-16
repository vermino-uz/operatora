/**
 * Departments — escalation routing groups, not an org chart. Traced from
 * the old frontend's `DepartmentsManager.tsx`/`WorkspaceGroupConnect.tsx`
 * against the real `departments/department.controller.ts` (`/departments/*`,
 * workspace-owner/admin-gated server-side via `assertCanManage`). A
 * department is "who gets paged when the AI agent can't handle a message
 * itself" — each has 0+ members and a `routing_prompt` the escalation
 * classifier uses to pick a department automatically, plus a notify mode
 * (DM each member directly, or post to one shared workspace Telegram group
 * and @mention members there).
 */

export type DepartmentNotifyMode = "dm" | "group";

export interface DepartmentMember {
  id: string;
  department_id: string;
  workspace_id: string;
  contact_full_name: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMemberInput {
  contact_full_name?: string | null;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
}

export interface WorkspaceDepartment {
  id: string;
  workspace_id: string;
  name: string;
  members: DepartmentMember[];
  routing_prompt: string | null;
  notify_mode: DepartmentNotifyMode;
  created_at: string;
  updated_at: string;
}

export interface DepartmentInput {
  name: string;
  routing_prompt?: string | null;
  notify_mode?: DepartmentNotifyMode;
}

/** The workspace's single shared Telegram group for group-mode escalations. */
export interface WorkspaceGroupStatus {
  group_chat_id: string | null;
  group_verify_code: string | null;
  group_verify_expires_at: string | null;
}

export interface GroupVerifyCode {
  group: WorkspaceGroupStatus;
  bot_username: string | null;
}

export interface RefinedRoutingPrompt {
  refined_prompt: string;
  notes: string;
}

export interface TestNotifyResult {
  sentTo: number;
  mode: DepartmentNotifyMode;
}

/** Telegram chat IDs are signed integers — matches the old frontend's
 * `validateChatId` exactly (empty is allowed, meaning "not set yet"). */
export function isValidTelegramChatId(chatId: string): boolean {
  return chatId.trim() === "" || /^-?\d+$/.test(chatId.trim());
}

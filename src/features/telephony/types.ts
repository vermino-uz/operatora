import type { OperatorSipAccount } from "@/features/team/types";

/**
 * Workspace-level telephony views ("SIP Configuration" / "GSM Lines"
 * settings sections) — NOT a separate backend contract from the
 * per-operator SIP/GSM panels already built for Team Members' Edit
 * dialog. Traced from the old frontend's `SipConfiguration.tsx` /
 * `TelephonyGsmLines.tsx`, both of which just list every workspace
 * member and embed the SAME per-operator panel
 * (`WorkspaceSipAccountsPanel.tsx` / `OperatorGsmLinesPanel.tsx`) inline
 * per member, so admins don't have to open each member's edit dialog to
 * manage telephony. Confirmed against the real backend:
 * `GET /admin-users/workspace-telephony/sip?workspace_id=` and
 * `GET /admin-users/workspace-telephony/gsm?workspace_id=`
 * (`admin-users.controller.ts` -> `admin-users.service.ts`'s
 * `listWorkspaceTelephonySip`/`listWorkspaceTelephonyGsm` — both
 * workspace-owner/admin-gated server-side via the same
 * `assertCanManageWorkspaceUsers` already relied on for Team Members).
 * This app reuses the identical roster-with-embedded-panel structure:
 * the roster call below gives the member list + counts, the embedded
 * `SipAccountsPanel`/`GsmLinesPanel` (already built under
 * `features/team/components/sip/`) does the actual per-member CRUD.
 */
export interface WorkspaceTelephonyMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_owner?: boolean;
}

export interface WorkspaceSipTelephonyMember extends WorkspaceTelephonyMember {
  workspace_role: string;
  sip_accounts: OperatorSipAccount[];
}

export interface WorkspaceGsmLineSummary {
  id: string;
  line_name: string | null;
  sim_number: string;
  sip_server: string;
  is_active: boolean | null;
  created_at: string;
  has_password: boolean;
}

export interface WorkspaceGsmTelephonyMember extends WorkspaceTelephonyMember {
  gsm_lines: WorkspaceGsmLineSummary[];
}

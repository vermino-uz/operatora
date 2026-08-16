/**
 * Super Agent (Hermes) settings section — `/super-agent/*`.
 *
 * Traced from the old frontend's `SuperAgentPanel.tsx` against the real
 * `backend/src/super-agent/super-agent.controller.ts`. This is a genuinely
 * substantial feature: a full-browser autonomous agent that logs into
 * external services (Bitrix24, amoCRM, Instagram/Facebook Ads, Google Ads,
 * ...) on the workspace's behalf using saved credentials, and runs
 * one-off/recurring tasks against them, reporting progress as an event log.
 *
 * Access policy (server-enforced, reproduced client-side only for UX —
 * every mutating endpoint re-checks `assertEligible` itself):
 * Corporate-tier plan AND the caller must be the workspace Founder/owner.
 * `GET /super-agent/settings` is the one endpoint that works for anyone (so
 * the panel can explain *why* it's locked instead of just erroring).
 *
 * Relationship to AI Chat's deferred cards: AI Chat
 * (`src/features/chat/components/ChatCards.tsx`) already renders
 * `super_agent_task`/`super_agent_question` cards read-only (status/text
 * only, no answer submission — PROGRESS.md's Phase 2b notes this
 * explicitly). This settings section is the natural home for enabling/
 * configuring Super Agent, and its `POST /super-agent/tasks/:id/answer`
 * endpoint is exactly what those chat cards would need to stop being
 * read-only — but wiring that into the chat feature is out of scope for
 * this settings pass (see PROGRESS.md's finding). This panel does implement
 * its own task list + inline answer/cancel actions, independent of the chat
 * surface.
 *
 * `workspace_id` IS sent as an explicit param on every call here (the
 * controller's own doc comment explains why: the workspace selected in the
 * UI may differ from the JWT's default, so every call resolves it via
 * `resolveWorkspaceForUser` instead of trusting the token alone) — the same
 * confirmed exception to "backend derives workspace from JWT" already
 * established for AI Chat/Conversations.
 */

export interface SuperAgentSettings {
  settings: {
    enabled: boolean;
    daily_task_limit: number;
    max_parallel_tasks: number;
    enabled_at: string | null;
  };
  runner: { configured: boolean; online: boolean };
  /** Server-computed gate: Corporate plan + Founder/owner. */
  access: { plan_ok: boolean; owner_ok: boolean };
}

export interface SuperAgentCredential {
  id: string;
  service: string;
  label: string;
  login_url: string | null;
  username: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export type SuperAgentTaskStatus =
  | "queued"
  | "dispatched"
  | "running"
  | "waiting_input"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "scheduled";

export const ACTIVE_TASK_STATUSES: SuperAgentTaskStatus[] = ["queued", "dispatched", "running", "waiting_input"];

export interface SuperAgentTask {
  id: string;
  thread_id: string | null;
  parent_task_id: string | null;
  title: string;
  instruction: string;
  task_type: "oneoff" | "recurring";
  schedule: { frequency?: "hourly" | "daily" | "weekly"; time?: string; weekday?: number } | null;
  status: SuperAgentTaskStatus;
  result_summary: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface SuperAgentTaskEvent {
  id: number;
  ts: string;
  kind: string;
  message: string | null;
  payload: unknown;
}

export const SUPER_AGENT_SERVICE_OPTIONS = [
  { value: "bitrix", label: "Bitrix24" },
  { value: "amocrm", label: "amoCRM" },
  { value: "instagram_ads", label: "Instagram / Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "other", label: "Other" },
];

export const TASK_STATUS_LABELS: Record<SuperAgentTaskStatus, string> = {
  queued: "Queued",
  dispatched: "Dispatched",
  running: "Running",
  waiting_input: "Waiting for input",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
};

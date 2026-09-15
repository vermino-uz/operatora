/**
 * Types for the super-admin console (`/admin/*`) — ported from the old
 * `app/admin/src/hooks/*.ts` (Vite + TanStack Query, same backend), traced
 * against the real controllers in
 * `dev.operatora/app/backend/src/admin/controllers/*`. See PROGRESS.md
 * "Phase 2l" for the full per-page verification trail.
 *
 * Gating: this console is platform-level (`SuperAdminGuard` = global
 * `super_admin` role AND server-side `SUPER_ADMIN_EMAILS` allowlist), not
 * the workspace-scoped RBAC matrix `canAccessModule`/`useModulePermission`
 * cover (see `src/auth/permissions.ts`) — those two dimensions are
 * unrelated, so the layout guard intentionally keeps using the existing
 * `isAdmin(roles)` global-role check (a UX courtesy either way; the backend
 * is the real boundary and additionally checks the email allowlist, which
 * the frontend has no way to know ahead of a 403).
 */

// ---------- Overview ----------

export interface AdminOverviewResponse {
  kpis: {
    workspaces: { total: number; active: number; trialing: number; suspended: number };
    users: { total: number; active: number; locked: number };
    aiSpend30d: { usdCents: number; openai: number; gemini: number };
    storage: { bytes: number };
  };
  alerts: {
    trialsExpiringSoon: Array<{ workspaceId: string; name: string; trialEndsAt: string }>;
    lockedUsers: number;
    failedIntegrations: number;
    criticalFeedback: number;
  };
  recentActivity: Array<{
    id: string;
    actorEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
}

// ---------- Workspaces ----------

export type WorkspaceSortKey = "newest" | "oldest" | "name_asc" | "most_users" | "most_tokens";
export type PlanTier = "free" | "pro" | "max" | "corporate" | "enterprise";
export type WorkspaceStatus = "active" | "trialing" | "suspended" | "canceled";

export interface WorkspacesFilters {
  q?: string;
  tier?: string;
  status?: string;
  sort?: WorkspaceSortKey;
  page?: number;
  perPage?: number;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  tier: string | null;
  status: string | null;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  userCount: number;
  aiSpend30dCents: number;
  totalTokens: number;
  createdAt: string | null;
}

export interface WorkspacesListResponse {
  rows: WorkspaceRow[];
  total: number;
  page: number;
  perPage: number;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  tier: string | null;
  status: string | null;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string | null;
  maxDesktopSessions: number | null;
  maxMobileSessions: number | null;
  maxWebSessions: number | null;
  counts: { users: number; leads: number; conversations: number };
  aiUsage30d: { costUsdCents: number; inputTokens: number; outputTokens: number };
}

export interface UpdateWorkspacePatch {
  name?: string;
  slug?: string;
  subscription_tier?: string;
  subscription_status?: string;
  duration_days?: number;
  max_desktop_sessions?: number | null;
  max_mobile_sessions?: number | null;
  max_web_sessions?: number | null;
}

export interface WorkspaceUserRow {
  id: string;
  userId: string;
  role: string;
  joinedAt: string | null;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
}

export interface WorkspaceLeadRow {
  id: string;
  name: string;
  phone: string | null;
  columnId: string | null;
  assignedOperatorId: string | null;
  createdAt: string | null;
  archived: boolean;
}

export interface WorkspaceConversationRow {
  id: string;
  createdAt: string | null;
  operatorName: string | null;
  clientPhone: string | null;
  durationSeconds: number | null;
  aiScore: number | null;
  sentiment: string | null;
  status: string | null;
}

export interface WorkspaceIntegrationsHealth {
  telegram: Array<{ id: string; bot_username: string | null; is_active: boolean }>;
  sip: Array<{ id: string; sip_number: string; server: string; is_active: boolean }>;
  gsm: Array<{ id: string; sip_server: string; sim_number: string; line_name: string | null; is_active: boolean }>;
  instagram: unknown[];
  sms: unknown[];
  googleSheets: unknown[];
}

export interface WorkspaceBillingDetail {
  subscription: {
    tier: string | null;
    status: string | null;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
    graceEndsAt: string | null;
    suspendedAt: string | null;
    suspendedReason: string | null;
  };
  usage30d: { costUsdCents: number; inputTokens: number; outputTokens: number };
}

export interface WorkspaceEntitlements {
  workspace_id: string;
  telegram_agentic_enabled: boolean | null;
  telegram_agentic_expires_at: string | null;
  instagram_agentic_enabled: boolean | null;
  instagram_agentic_expires_at: string | null;
  voice_enabled: boolean | null;
  voice_expires_at: string | null;
  gsm_sim_enabled: boolean | null;
  gsm_sim_enabled_expires_at: string | null;
  gsm_sim_limit: number | null;
  gsm_sim_limit_expires_at: string | null;
  instagram_accounts_limit: number | null;
  instagram_accounts_limit_expires_at: string | null;
  telegram_channel_enabled: boolean | null;
  telegram_channel_expires_at: string | null;
  instagram_channel_enabled: boolean | null;
  instagram_channel_expires_at: string | null;
  sms_channel_enabled: boolean | null;
  sms_channel_expires_at: string | null;
  whatsapp_channel_enabled: boolean | null;
  whatsapp_channel_expires_at: string | null;
  multi_channel_agent_enabled: boolean | null;
  multi_channel_agent_expires_at: string | null;
  notes: string | null;
}

export type WorkspaceEntitlementsPatch = Partial<Omit<WorkspaceEntitlements, "workspace_id">>;

// ---------- Users ----------

export interface UsersFilters {
  q?: string;
  role?: string;
  status?: string;
  workspaceId?: string;
  sort?: "newest" | "oldest" | "most_active";
  page?: number;
  perPage?: number;
}

export interface UserRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  internalNumber: string | null;
  roles: string[];
  workspaceCount: number;
  status: "active" | "locked" | "inactive";
  isActive: boolean;
  lockedUntil: string | null;
  failedLoginCount: number;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface UsersListResponse {
  rows: UserRow[];
  total: number;
  page: number;
  perPage: number;
}

export interface UserDetail {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  internalNumber: string | null;
  avatarUrl: string | null;
  roles: Array<{ role: string; createdAt: string | null }>;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string | null;
    role: string;
    tier: string | null;
    status: string | null;
    joinedAt: string | null;
  }>;
  isActive: boolean;
  status: "active" | "locked" | "inactive";
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  failedLoginCount: number;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface UpdateUserPatch {
  full_name?: string;
  email?: string;
  phone?: string;
  internal_number?: string;
  avatar_url?: string;
}

export interface UserSessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export interface ImpersonationResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null };
  impersonatedBy: { userId: string; email: string | null };
}

// ---------- Conversations ----------

export interface AdminConversationsFilters {
  workspaceId?: string;
  status?: string;
  sentiment?: string;
  operator?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export interface AdminConversationRow {
  id: string;
  operatorName: string;
  clientName: string;
  clientPhone: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  status: string | null;
  sentiment: string | null;
  aiScore: number | null;
  durationSec: number | null;
  source: string | null;
  language: string | null;
  createdAt: string;
}

export interface AdminConversationsStats {
  total: number;
  completed: number;
  avgScore: number;
  avgDurationSec: number;
  bySentiment: Array<{ sentiment: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

// ---------- AI usage ----------

export interface AiUsageFilters {
  workspaceId?: string;
  model?: string;
  feature?: string;
  from?: string;
  to?: string;
}

export interface AiUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  requests: number;
}

export interface AiUsageByWorkspace {
  workspaceId: string;
  workspaceName: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  requests: number;
  topFeature: string | null;
}

export interface AiUsageByModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  requests: number;
}

export interface AiUsageByFeature {
  feature: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  requests: number;
}

export interface AiUsageByDay {
  day: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  requests: number;
}

export interface AiUsageEvent {
  id: string;
  feature: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsdCents: number;
  createdAt: string;
}

export interface AiCreditMeter {
  feature: string;
  label: string;
  used: number;
  limit: number | null;
}

export interface AiCreditsSnapshot {
  periodKey: string;
  planSlug: string;
  meters: AiCreditMeter[];
}

export interface AiUsageOverview {
  totals: AiUsageTotals;
  topWorkspaces: AiUsageByWorkspace[];
  byModels: AiUsageByModel[];
  byFeatures: AiUsageByFeature[];
  credits: AiCreditsSnapshot | null;
}

export const AI_FEATURE_LABELS: Record<string, string> = {
  ai_chat: "AI chat",
  ai_transcript: "Transcript",
  ai_conversation: "Copilot conversation",
  ai_agent_reply: "Agent reply",
  ai_agent_suggest: "Agent suggest",
  ai_inbox_recap: "Inbox recap",
  ai_agent_copilot: "Agent copilot",
  ai_ranker: "AI ranker",
  ai_lead_distribution: "Lead distribution",
  ai_lead_assist: "Helper (Lead AI Assist)",
  ai_custom_dashboard: "Stat dashboard",
  ai_ads_copilot: "Ads copilot",
};

// ---------- Integrations ----------

export type IntegrationKind = "sip" | "sms" | "google_sheets" | "telegram";

export interface IntegrationRow {
  kind: IntegrationKind;
  id: string;
  workspaceId: string | null;
  workspaceName: string | null;
  label: string;
  isActive: boolean;
  detail: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IntegrationsSummary {
  totals: Record<string, { total: number; active: number }>;
  rows: IntegrationRow[];
}

export interface IntegrationsFilters {
  kind?: IntegrationKind;
  workspaceId?: string;
  status?: "active" | "inactive";
}

// ---------- Billing (platform overview + notification settings) ----------

export interface BillingOverview {
  totalWorkspaces: number;
  byTier: Array<{ tier: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  trialingSoon: Array<{ id: string; name: string; trialEndsAt: string; ownerEmail: string | null }>;
  suspended: Array<{ id: string; name: string; suspendedAt: string; reason: string | null }>;
}

export interface BillingNotificationSettings {
  enabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  daysBeforeExpiry: number;
  graceDays: number;
  notifyOnGrace: boolean;
  notifyOnPastDue: boolean;
  notifyOnSuspended: boolean;
  smsTemplate: string;
  inAppTitleTemplate: string;
  inAppContentTemplate: string;
}

export type UpdateBillingNotificationSettingsPatch = Partial<BillingNotificationSettings>;

export interface BillingNotificationPreviewRow {
  workspaceId: string;
  workspaceName: string;
  channel: string;
  reason: string;
  [key: string]: unknown;
}

// ---------- Tariffs / Plans ----------

export type MessageChannel = "telegram" | "sms" | "instagram" | "whatsapp";
export type AiModelId =
  | "gemini-flash"
  | "gemini-pro"
  | "claude-sonnet"
  | "claude-opus"
  | "openai-mini"
  | "openai-nano"
  | "local";

export const ALL_AI_MODEL_IDS: AiModelId[] = [
  "gemini-flash",
  "gemini-pro",
  "claude-sonnet",
  "claude-opus",
  "openai-mini",
  "openai-nano",
  "local",
];

export const AI_MODEL_ID_LABELS: Record<AiModelId, string> = {
  "gemini-flash": "Gemini Flash",
  "gemini-pro": "Gemini Pro",
  "claude-sonnet": "Claude Sonnet",
  "claude-opus": "Claude Opus",
  "openai-mini": "OpenAI Mini",
  "openai-nano": "OpenAI Nano",
  local: "Local (Gemma)",
};

export const ALL_CHANNELS: MessageChannel[] = ["telegram", "sms", "instagram", "whatsapp"];
export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  telegram: "Telegram",
  sms: "SMS",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export type SeatLimitKey =
  | "calls_per_month"
  | "ai_dashboards"
  | "custom_dashboards"
  | "image_generations"
  | "max_operators"
  | "storage_mb"
  | "storage_retention_days";

export const SEAT_LIMIT_KEYS: SeatLimitKey[] = [
  "calls_per_month",
  "ai_dashboards",
  "custom_dashboards",
  "image_generations",
  "max_operators",
  "storage_mb",
  "storage_retention_days",
];

export const SEAT_LIMIT_LABELS: Record<SeatLimitKey, string> = {
  calls_per_month: "Calls / month",
  ai_dashboards: "AI dashboards",
  custom_dashboards: "Custom dashboards",
  image_generations: "Image generations / month",
  max_operators: "Operator seats",
  storage_mb: "Storage (MB)",
  storage_retention_days: "Storage retention (days)",
};

/** null on any numeric limit = unlimited. Only the seat/storage limits this
 * page edits are typed strictly; other keys (credits_*, etc.) pass through
 * as an open record so a PATCH never drops fields this UI doesn't render. */
export interface PlanLimits extends Partial<Record<SeatLimitKey, number | null>> {
  [key: string]: number | null | undefined;
}

export interface PlanFeatures {
  channels: MessageChannel[];
  agentic_mode: boolean;
  ai_chat_models: string[];
  ai_feature_models: Record<string, string>;
}

export interface TariffPlan {
  slug: string;
  name: string;
  limits: PlanLimits;
  features: PlanFeatures;
}

export interface UpdatePlanPayload {
  limits?: Partial<PlanLimits>;
  features?: Partial<PlanFeatures>;
}

export interface AiModelPricingRow {
  modelId: AiModelId;
  inputPer1M: number;
  outputPer1M: number;
}

// ---------- Feedback ----------

export interface FeedbackRow {
  id: string;
  type: string;
  category: string | null;
  title: string | null;
  content: string;
  severity: string | null;
  status: string;
  userId: string | null;
  userEmail: string | null;
  routePath: string | null;
  rating: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  adminNotes: string | null;
  createdAt: string;
}

export interface FeedbackFilters {
  type?: string;
  category?: string;
  severity?: string;
  status?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export interface FeedbackListResponse {
  rows: FeedbackRow[];
  total: number;
  page: number;
  perPage: number;
  statusCounts: Record<string, number>;
}

// ---------- Audit logs ----------

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  workspaceId: string | null;
  changes: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsFilters {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  workspaceId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

// ---------- System ----------

export interface AdminSystemHealth {
  workspaces: number;
  users: number;
  conversations: number;
  leads: number;
  aiInstructions: number;
  dbSizeBytes: number | null;
}

export interface MobileAppInfo {
  last_version: string | null;
  last_allowed_version: string | null;
}

export interface AiInstructionRow {
  id: string;
  name: string;
  description: string | null;
  instructionText: string;
  category: string;
  isActive: boolean;
  priority: number;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiInstructionPatch {
  name?: string;
  description?: string;
  instructionText?: string;
  category?: string;
  isActive?: boolean;
  priority?: number;
}

// ---------- Send notification ----------

export interface SendNotificationInput {
  userId?: string;
  workspaceId?: string;
  title: string;
  content: string;
  type?: "system" | "message" | "lead_update";
  imageUrl?: string;
}

export interface SendNotificationResponse {
  sent: number;
}

// ---------- Analytics (product usage events — confirmed live, not in the
// original phase brief's route list, ported anyway per task instructions) ----------

export interface AdminAnalyticsFilters {
  workspaceId?: string;
  eventName?: string;
  source?: string;
  from?: string;
  to?: string;
}

export interface AnalyticsTotals {
  events: number;
  uniqueSessions: number;
  uniqueUsers: number;
  uniqueWorkspaces: number;
}

export interface AnalyticsByEventName {
  eventName: string;
  count: number;
}

export interface AnalyticsByWorkspace {
  workspaceId: string;
  workspaceName: string | null;
  count: number;
}

export interface AnalyticsByDay {
  day: string;
  count: number;
}

export interface AnalyticsEventRow {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  userId: string | null;
  sessionId: string | null;
  source: string;
  eventName: string;
  payload: unknown;
  path: string | null;
  createdAt: string;
}

export interface AnalyticsEventsListResponse {
  rows: AnalyticsEventRow[];
  total: number;
  page: number;
  perPage: number;
}

// ---------- AI feedback (agent-reply thumbs down/up review queue —
// confirmed live, ported alongside Analytics for the same reason) ----------

export interface AiFeedbackRow {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  userId: string;
  userEmail: string | null;
  threadId: string | null;
  messageId: string | null;
  rating: number;
  reasonCode: string | null;
  reasonText: string | null;
  contextSnapshot: unknown;
  adminLabel: string | null;
  reviewStatus: string;
  datasetEligible: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  adminNotes: string | null;
  createdAt: string;
}

export interface AiFeedbackFilters {
  rating?: string;
  label?: string;
  status?: string;
  workspaceId?: string;
  page?: number;
  perPage?: number;
}

export interface AiFeedbackListResponse {
  rows: AiFeedbackRow[];
  total: number;
  page: number;
  perPage: number;
  summary: { notUseful: number; unreviewed: number; useful: number };
}

export interface ReviewAiFeedbackPatch {
  adminLabel?: string;
  adminNotes?: string;
  reviewStatus?: string;
  datasetEligible?: boolean;
}

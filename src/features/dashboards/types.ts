/**
 * AI Dashboards (`/dashboards`) — traced directly from
 * `/www/wwwroot/dev.operatora/app/backend/src/custom-dashboards/
 * {custom-dashboards.controller,custom-dashboards.service}.ts`
 * (`/custom-dashboards/*`, `custom_dashboards` table). Real backend, not a
 * lookalike: reads (`GET /meta`, `GET`, `GET /:id`) are gated on the
 * `ai_dashboards` RBAC module (matches this app's sidebar/route gate);
 * `POST /generate`, `POST /:id/edit`, `DELETE /:id` are additionally
 * workspace-owner-only server-side (`assertWorkspaceOwner`, independent of
 * the RBAC module check — confirmed directly in the service, not assumed);
 * `PUT /:id` (manual save — spec/title/shared) has no owner or module
 * decorator on that one route, so any authenticated workspace member who
 * already passed the `view` gate for the other routes can technically call
 * it too. This app only exposes a save-triggering UI (the AI edit chat,
 * which calls `/edit` not `/:id` directly) to the owner, matching the old
 * frontend's own `isOwner`-gated `DashboardView` panel — not inventing a
 * broader manual-editor UI the old frontend didn't have either.
 */

export type WidgetType = "kpi" | "bar" | "line" | "breakdown" | "funnel" | "table" | "list";
export type WidgetFormat = "number" | "percent" | "duration" | "score";
export type DashboardCategory = "sales" | "marketing" | "conversion" | "operators" | "leads" | "general";

export interface WidgetSpec {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  format?: WidgetFormat;
  comparePrevious?: boolean;
  span?: number;
  query: Record<string, unknown>;
}

export interface DashboardSpec {
  title: string;
  description: string;
  category: DashboardCategory;
  view?: "cards" | "list";
  widgets: WidgetSpec[];
}

export interface KpiData {
  value: number;
  previous?: number | null;
  deltaPct?: number | null;
}
export interface SeriesPoint {
  label: string;
  value: number;
}
export interface BreakdownItem {
  label: string;
  value: number;
  pct: number;
}
export interface TableData {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
}
export type WidgetData =
  | { kind: "kpi"; data: KpiData }
  | { kind: "series"; data: SeriesPoint[] }
  | { kind: "breakdown"; data: BreakdownItem[] }
  | { kind: "table"; data: TableData }
  | { kind: "empty"; reason?: string };

export interface ResolvedWidget extends WidgetSpec {
  result: WidgetData;
}
export interface ResolvedDashboard {
  title: string;
  description: string;
  category: DashboardCategory;
  view: "cards" | "list";
  widgets: ResolvedWidget[];
}

export interface DashboardChatMessage {
  role: "user" | "assistant";
  text: string;
  at: string;
}

export interface CustomDashboardRow {
  id: string;
  workspace_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  category: DashboardCategory;
  prompt: string | null;
  spec: DashboardSpec;
  chat: DashboardChatMessage[];
  suggestions: string[];
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardMeta {
  isOwner: boolean;
  planSlug: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  canCreate: boolean;
}

export interface ResolvedResponse {
  dashboard: CustomDashboardRow;
  resolved: ResolvedDashboard;
}

export interface DashboardEditResponse extends ResolvedResponse {
  note: string;
  suggestions: string[];
}

/** Category accent color, ported 1:1 from the old frontend's
 * `DashboardWidget.tsx`'s `CATEGORY_ACCENT`. */
export const CATEGORY_ACCENT: Record<string, string> = {
  sales: "#4b7a52",
  marketing: "#7C3AED",
  conversion: "#c78a2a",
  operators: "#3b6ea5",
  leads: "#4b7a52",
  general: "#1f3338",
};

export const CATEGORY_LABELS: Record<DashboardCategory, string> = {
  sales: "Sales",
  marketing: "Marketing",
  conversion: "Conversion",
  operators: "Operators",
  leads: "Leads",
  general: "General",
};

/** Column span → tailwind class (grid is 4 cols on desktop) — 1:1 port. */
export function spanClass(span?: number): string {
  switch (Math.min(Math.max(span ?? 1, 1), 4)) {
    case 1:
      return "lg:col-span-1";
    case 2:
      return "lg:col-span-2";
    case 3:
      return "lg:col-span-3";
    default:
      return "lg:col-span-4";
  }
}

export function formatWidgetValue(value: number, format?: WidgetFormat): string {
  if (format === "percent") return `${round1(value)}%`;
  if (format === "score") return `${Math.round(value)}/100`;
  if (format === "duration") {
    const s = Math.round(value);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
  }
  return Math.round(value).toLocaleString();
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

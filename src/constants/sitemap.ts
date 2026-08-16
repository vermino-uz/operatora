import type { SVGProps } from "react";
import { LayoutHeaderCells, Handset, Envelope, Target, ListCheck, Sparkles, Megaphone } from "@gravity-ui/icons";

/** @gravity-ui/icons ships plain function components (no shared exported
 * type like lucide's `LucideIcon`) — this is the equivalent shape. */
export type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

/**
 * Single source of truth for top-level sidebar nav items, mirrored from the
 * old frontend's `config/app-sitemap.ts` pattern. Add an entry here and
 * `AppSidebar.tsx` picks it up automatically — no separate list to keep in
 * sync.
 *
 * Deliberately excludes `gallery`: in the old app it's hidden from the
 * sidebar and opened from within the AI Chat page instead (see brief).
 *
 * `path` values use this app's own route constants (e.g. `/dashboard`, not
 * `/` like the old SPA) — see `constants/routes.ts`.
 */
export const APP_SITEMAP = {
  topLevel: [
    { key: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutHeaderCells },
    { key: "conversations", path: "/conversations", label: "Conversations", icon: Handset },
    { key: "messages", path: "/messages", label: "Messages", icon: Envelope },
    { key: "leads", path: "/leads", label: "Leads", icon: Target },
    { key: "tasks", path: "/tasks", label: "Tasks", icon: ListCheck },
    // Owner-only in the old app (workspace role, not a global role). Gated
    // in AppSidebar via a temporary isAdmin() approximation — see comment
    // there.
    { key: "ai-dashboards", path: "/dashboards", label: "AI Dashboards", icon: Sparkles },
    { key: "ads", path: "/ads", label: "Ads", icon: Megaphone },
  ],
} as const;

export type TopLevelNavKey = (typeof APP_SITEMAP.topLevel)[number]["key"];

export interface TopLevelNavItem {
  key: TopLevelNavKey;
  path: string;
  label: string;
  icon: IconComponent;
}

/** `data-testid` for a top-level sidebar nav icon, mirroring the old app's convention. */
export function topLevelNavTestId(key: TopLevelNavKey): string {
  return `sidebar-nav-${key}`;
}

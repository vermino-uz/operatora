import type { SVGProps } from "react";
import { LayoutHeaderCells, Handset, Envelope, Target, ListCheck, Sparkles, Megaphone, Persons, Book, Hashtag } from "@gravity-ui/icons";

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
    // Gated in AppSidebar by the same global-role allowlist as the page
    // itself (`canViewOperatorsPage`) — finance_manager-only accounts
    // don't see it, matching the old sidebar/`canViewPage` behavior.
    { key: "operators", path: "/operators", label: "Operators", icon: Persons },
    // Gated in AppSidebar by workspace RBAC `ai_dashboards.view` (same as old UI).
    { key: "ai-dashboards", path: "/dashboards", label: "AI Dashboards", icon: Sparkles },
    { key: "ads", path: "/ads", label: "Ads", icon: Megaphone },
    // Gated in AppSidebar by the same global-role allowlist as the page
    // itself (`canViewInstructionsPage`) — finance_manager-only accounts
    // don't see it, matching the old sidebar/`canViewPage` behavior.
    { key: "instructions", path: "/instructions", label: "Instructions", icon: Book },
    // Gated in AppSidebar by `canViewSocialMediaAdvisorPage` — global-admin
    // roles only (stricter than every other gated item here), matching the
    // old `canViewPage("social-media-advisor")` allowlist exactly.
    { key: "social-media-advisor", path: "/social-media-advisor", label: "Social Media Advisor", icon: Hashtag },
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

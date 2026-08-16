"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Bell,
  Gear as SettingsIcon,
  ArrowRightFromSquare as LogOut,
  Grip,
  Sun,
  Moon,
  Display as Monitor,
  ChevronDown,
} from "@gravity-ui/icons";
import { Avatar, ToggleButton, ToggleButtonGroup, Tooltip } from "@heroui/react";

import { APP_SITEMAP, topLevelNavTestId, type TopLevelNavItem, type TopLevelNavKey } from "@/constants/sitemap";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/state/session-store";
import { useUiStore } from "@/state/ui-store";
import { isAdmin } from "@/auth/permissions";
import { useLogoutMutation } from "@/features/auth/hooks/useLogoutMutation";

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getUserInitial(email?: string | null): string {
  return email ? email.charAt(0).toUpperCase() : "U";
}

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

const subscribeNoop = () => () => {};
/** True only after client hydration — same value both react-dom render
 * passes settle on, so no cascading-setState-in-effect is needed to avoid
 * a hydration mismatch (see `ThemeSwitcher` below). */
function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

/**
 * Light/dark/system switcher. `theme` from next-themes is `undefined` until
 * mounted client-side (it reads localStorage), so the selection is left
 * empty on the server/first paint to avoid a hydration mismatch.
 */
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  return (
    <ToggleButtonGroup
      aria-label="Theme"
      selectionMode="single"
      disallowEmptySelection
      fullWidth
      size="sm"
      selectedKeys={mounted && theme ? [theme] : []}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (typeof next === "string") setTheme(next);
      }}
    >
      {THEME_OPTIONS.map(({ id, label, icon: Icon }, index) => (
        <ToggleButton key={id} id={id} aria-label={label} isIconOnly>
          {index > 0 ? <ToggleButtonGroup.Separator /> : null}
          <Icon className="size-4" aria-hidden="true" />
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Shared rail button chrome for nav links + the Doc/notification icons.
 * Always left-aligned with the same fixed padding in both collapsed and
 * expanded states (never a centered-square vs. full-width-row switch) —
 * the icon sits at the exact same X position either way, so hovering to
 * peek the sidebar open never shifts anything, only reveals label text to
 * its right. Fixed 16px radius (not the theme-relative `rounded-2xl`
 * scale) since a radius tied to the theme's `--radius` can clip a 40px-tall
 * row to a pill/circle once `--radius` grows past ~0.63rem. */
function railButtonClasses(expanded: boolean, isActive: boolean): string {
  // Collapsed: `justify-center` in a fixed 40x40 (`w-10 h-10`) box — a
  // real center, not an incidental one. `justify-start` with fixed 9px
  // padding only *looked* centered for the 22px nav icons (9+22+9=40,
  // exact symmetric math); the 20px Doc/Bell/Avatar icons got 9px left but
  // 11px right under that scheme, visibly off-center.
  //
  // Expanded: still `justify-start` (label needs to sit to the icon's
  // right) — the two only disagree on icon X-position by ~1px for the
  // 20px icons ((40-20)/2=10 vs the expanded state's fixed 9px), which is
  // imperceptible, unlike the old collapsed-vs-expanded jump this file's
  // history already fixed once (see AppSidebar's hover-peek comments).
  //
  // `h-10` is fixed (not derived from padding) so the collapsed box is a
  // true 40x40 square regardless of icon size — height used to come from
  // `py-2` around whatever icon happened to be inside (22px nav icons vs.
  // 20px Doc/Bell/Avatar icons), so rows ended up 38px vs. 36px tall next
  // to an always-40px width — off-square, not aligned row to row.
  const base =
    "flex h-10 shrink-0 items-center gap-3 rounded-[16px] border-[1.5px] border-black/[0.08] text-foreground transition-colors hover:bg-black/[0.04] dark:border-white/[0.12] dark:hover:bg-white/[0.06]";
  const layout = expanded ? "w-full justify-start px-[9px]" : "w-10 justify-center";
  const active = isActive ? "border-transparent bg-black/[0.06] shadow-sm dark:bg-white/[0.1]" : "";
  return `${base} ${layout} ${active}`;
}

interface SortableNavItemProps {
  item: TopLevelNavItem;
  isActive: boolean;
  expanded: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  onDragStart: (key: TopLevelNavKey) => void;
  onDragEnter: (key: TopLevelNavKey) => void;
  onDragEnd: () => void;
  onDrop: (key: TopLevelNavKey) => void;
}

/**
 * A drag-to-reorder nav item — plain native HTML5 drag-and-drop directly on
 * the real `<Link>`, not HeroUI's `ListBox`/`ListBox.Item`: that wrapper
 * unconditionally injects its own `children` callback onto the underlying
 * React Aria item regardless of a `render` override, which silently
 * swallowed the icon's label text. Native DOM drag events avoid the
 * collection-abstraction mismatch entirely and keep this a real `<a href>`
 * the whole time — no separate "is this a link or a list item" question.
 */
function SortableNavItem({
  item,
  isActive,
  expanded,
  isDragged,
  isDropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: SortableNavItemProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      data-testid={topLevelNavTestId(item.key)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(item.key);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter(item.key);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(item.key);
      }}
      className={`${railButtonClasses(expanded, isActive)} ${isDragged ? "opacity-40" : ""} ${
        isDropTarget ? "ring-2 ring-accent" : ""
      }`}
    >
      <Icon className="size-[22px] shrink-0" aria-hidden="true" />
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
          <Grip className="size-3.5 shrink-0 cursor-grab text-foreground/30" aria-hidden="true" />
        </>
      ) : null}
    </Link>
  );
}

/**
 * Icon-only left navigation rail — desktop layout only. Mirrors the old
 * frontend's `AppSidebar.tsx` structure (logo, nav icons, Doc/notifications/
 * profile at the bottom) rebuilt on HeroUI primitives.
 *
 * The old app's mobile bottom-nav variant (`MobileBottomNav.tsx`) is
 * deliberately NOT built here — see PROGRESS.md follow-ups. This rail is
 * just kept from breaking layout on narrow viewports (it doesn't grow/shrink
 * content awkwardly), not a full responsive nav pattern.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const roles = useSessionStore((s) => s.roles);
  const logout = useLogoutMutation();
  // Always collapsed at rest — no pin/toggle button (it caused the header
  // row to switch between a stacked and a side-by-side layout, shifting the
  // nav icons below it every time). Hovering the rail peeks it open as an
  // overlay; nothing above the nav icons ever changes shape now, so nothing
  // shifts.
  const [isHovering, setIsHovering] = useState(false);
  // The account menu is an inline-expanding panel now (not a floating
  // popover — see below), so keeping the sidebar expanded while it's open
  // is just "OR it into peekExpanded", no portal/hover-boundary problem to
  // work around like the old Dropdown-based version had. Press-only (not
  // hover) — it stays open until pressed again, regardless of the cursor.
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const peekExpanded = isHovering || isProfileOpen;

  const navOrder = useUiStore((s) => s.navOrder);
  const reorderNav = useUiStore((s) => s.reorderNav);
  const [draggedKey, setDraggedKey] = useState<TopLevelNavKey | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<TopLevelNavKey | null>(null);

  // Every item is visible to any authenticated user except `ai-dashboards`,
  // which the old app gates on the workspace-level `owner` role. That role
  // isn't available client-side yet (only global `roles[]` is fetched — see
  // PROGRESS.md Phase 2b "Workspace/session bootstrap polish"), so this is a
  // temporary simplification: approximate "owner-only" with the global admin
  // check until workspace permissions are wired up.
  //
  // Ordered by the user's persisted drag-to-reorder preference — any key
  // not yet in that list (a newly shipped nav item `navOrder` predates)
  // falls back to append at the end, so it doesn't just vanish.
  const byKey = new Map<TopLevelNavKey, TopLevelNavItem>(APP_SITEMAP.topLevel.map((item) => [item.key, item]));
  const knownKeys = APP_SITEMAP.topLevel.map((item) => item.key);
  const orderedKeys = [...navOrder, ...knownKeys.filter((k) => !navOrder.includes(k))];
  const visibleItems = orderedKeys
    .map((key) => byKey.get(key))
    .filter((item): item is TopLevelNavItem => Boolean(item))
    .filter((item) => (item.key === "ai-dashboards" ? isAdmin(roles) : true));

  function handleDrop(targetKey: TopLevelNavKey) {
    if (draggedKey && draggedKey !== targetKey) {
      reorderNav([draggedKey], targetKey, "before");
    }
    setDraggedKey(null);
    setDropTargetKey(null);
  }

  function handleSignOut() {
    logout.mutate(undefined, {
      onSettled: () => router.replace(ROUTES.login),
    });
  }

  return (
    // Spacer reserves layout space at the collapsed width only — hovering
    // never shifts page content. The actual nav overlays on top of it
    // (absolutely positioned) so a hover-peek floats over the main content
    // instead of pushing it, matching how HeroUI Pro's own Sidebar
    // separates an "offcanvas wrapper" spacer from the visual panel.
    <div className="relative h-full w-[4.5rem] shrink-0">
      <nav
        aria-label="Primary"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`absolute inset-y-0 left-0 z-20 flex h-full flex-col items-stretch justify-between border-r border-black/[0.06] bg-background/60 px-2 py-4 backdrop-blur-md transition-[width] duration-200 dark:border-white/10 ${
          peekExpanded ? "w-60 shadow-xl" : "w-[4.5rem]"
        }`}
      >
        <div className="flex w-full flex-col gap-2.5">
          <Link
            href={ROUTES.dashboard}
            aria-label="Operatora home"
            className="flex size-10 shrink-0 items-center justify-center rounded-[16px] bg-foreground text-background transition-opacity hover:opacity-90"
          >
            <span className="text-sm font-bold">O</span>
          </Link>

          <div className="h-2" aria-hidden="true" />

          {visibleItems.map((item) => (
            <SortableNavItem
              key={item.key}
              item={item}
              isActive={isPathActive(pathname, item.path)}
              expanded={peekExpanded}
              isDragged={draggedKey === item.key}
              isDropTarget={dropTargetKey === item.key && draggedKey !== item.key}
              onDragStart={setDraggedKey}
              onDragEnter={setDropTargetKey}
              onDragEnd={() => {
                setDraggedKey(null);
                setDropTargetKey(null);
              }}
              onDrop={handleDrop}
            />
          ))}
        </div>

        <div className="flex w-full flex-col gap-3">
          {(() => {
            const docLink = (
              <Link
                href={ROUTES.doc}
                aria-label="Documentation"
                aria-current={isPathActive(pathname, ROUTES.doc) ? "page" : undefined}
                data-testid="sidebar-nav-doc"
                className={railButtonClasses(peekExpanded, isPathActive(pathname, ROUTES.doc))}
              >
                <BookOpen className="size-5 shrink-0" aria-hidden="true" />
                {peekExpanded ? <span className="truncate text-sm font-medium">Documentation</span> : null}
              </Link>
            );
            if (peekExpanded) return docLink;
            return (
              <Tooltip delay={200}>
                {docLink}
                <Tooltip.Content placement="right" offset={12}>
                  Documentation
                </Tooltip.Content>
              </Tooltip>
            );
          })()}

          {/* Notification bell — icon placeholder only, no dropdown/data wired
              yet (out of scope for this shell pass). */}
          {(() => {
            const bellButton = (
              <button type="button" aria-label="Notifications" className={railButtonClasses(peekExpanded, false)} disabled>
                <Bell className="size-5 shrink-0" aria-hidden="true" />
                {peekExpanded ? <span className="truncate text-sm font-medium">Notifications</span> : null}
              </button>
            );
            if (peekExpanded) return bellButton;
            return (
              <Tooltip delay={200}>
                {bellButton}
                <Tooltip.Content placement="right" offset={12}>
                  Notifications
                </Tooltip.Content>
              </Tooltip>
            );
          })()}

          {/* Account — an inline-expanding panel, not a floating popover.
              `flex-col-reverse` is the key trick: the button is FIRST in
              DOM (so it's still first in reading/tab order) but renders
              LAST — i.e. pinned to this wrapper's own bottom edge — while
              the menu content (added AFTER it in DOM) renders ABOVE it.
              Because this wrapper is itself the last child of a
              bottom-pinned group (outer nav's justify-between), the
              wrapper's bottom edge — and therefore the button — never
              moves as it grows; only its top edge (and everything above
              it: Doc, Notifications) gets pushed further up. */}
          <div className="flex w-full flex-col-reverse gap-1">
            <button
              type="button"
              data-testid="sidebar-profile-menu-button"
              aria-label="Account menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((v) => !v)}
              // Same chrome as the nav items/Doc/Notifications — border,
              // hover, sizing all match, just with the avatar swapped in
              // for an icon.
              className={railButtonClasses(peekExpanded, false)}
            >
              {/* HeroUI's `sm` Avatar renders at 36px in this theme
                  (`--spacing` * 8), but the collapsed rail button only has
                  ~22px of content width — the same slot every other 20-22px
                  icon fits exactly — so `sm` overflowed past the button's
                  edge instead of sitting centered. `!size-5` matches
                  Doc/Notifications' icon size and overrides the `sm`
                  variant's fixed width/height class. */}
              <Avatar size="sm" className="!size-5 shrink-0">
                <Avatar.Fallback>{getUserInitial(user?.email)}</Avatar.Fallback>
              </Avatar>
              {peekExpanded ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                    {user?.full_name?.trim() || user?.email?.split("@")[0] || "Account"}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 text-foreground/40 transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </>
              ) : null}
            </button>

            {/* Animates open/closed via a grid-rows 0fr→1fr transition (the
                standard trick for animating to/from an unknown "auto"
                height) instead of just mounting/unmounting — `overflow-hidden`
                on the inner row clips it mid-transition. Bordered like the
                other rail buttons so it reads as a distinct panel. */}
            <div
              className={`grid w-full transition-[grid-template-rows] duration-200 ease-out ${
                peekExpanded && isProfileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex w-full flex-col gap-2 rounded-[16px] border-[1.5px] border-black/[0.08] bg-black/[0.03] px-2 py-2 dark:border-white/[0.12] dark:bg-white/[0.04]">
                  <div className="flex min-w-0 flex-col px-1">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {user?.full_name?.trim() || user?.email?.split("@")[0] || "Workspace"}
                    </span>
                    {user?.email ? (
                      <span className="truncate text-xs text-foreground/60">{user.email}</span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-xs text-foreground/60">Theme</span>
                    <ThemeSwitcher />
                  </div>

                  <Link
                    href={ROUTES.settings}
                    data-testid="sidebar-profile-settings"
                    className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />
                    Settings
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={logout.isPending}
                    className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
                  >
                    <LogOut className="size-4 shrink-0" aria-hidden="true" />
                    {logout.isPending ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

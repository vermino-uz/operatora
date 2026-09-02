"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutHeaderCells,
  Handset,
  Envelope,
  Target,
  Gear as SettingsIcon,
} from "@gravity-ui/icons";

import { ROUTES } from "@/constants/routes";

const TABS = [
  { key: "dashboard", path: ROUTES.dashboard, label: "AI", icon: LayoutHeaderCells },
  { key: "leads", path: ROUTES.leads, label: "Leads", icon: Target },
  { key: "conversations", path: ROUTES.conversations, label: "Calls", icon: Handset },
  { key: "messages", path: ROUTES.messages, label: "Inbox", icon: Envelope },
  { key: "settings", path: ROUTES.settings, label: "Settings", icon: SettingsIcon },
] as const;

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Primary navigation on viewports below `md` — desktop uses `AppSidebar`. */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.06] bg-background/95 backdrop-blur-md md:hidden dark:border-white/10"
    >
      <div className="flex h-14 items-stretch justify-around px-0.5">
        {TABS.map((tab) => {
          const active = isPathActive(pathname, tab.path);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.path}
              data-testid={`mobile-nav-${tab.key}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1"
            >
              <span
                className={`mb-0.5 size-1 rounded-full transition-colors ${active ? "bg-accent" : "bg-transparent"}`}
                aria-hidden="true"
              />
              <Icon
                className={`size-[22px] shrink-0 transition-colors ${active ? "text-accent" : "text-foreground/40"}`}
                aria-hidden="true"
              />
              <span
                className={`max-w-full truncate px-0.5 text-[10px] leading-tight transition-colors ${
                  active ? "font-semibold text-accent" : "font-medium text-foreground/40"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
    </nav>
  );
}

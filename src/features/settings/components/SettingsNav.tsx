"use client";

import { useState } from "react";
import { ChevronDown } from "@gravity-ui/icons";

import { SETTINGS_SITEMAP, settingsNavTestId } from "@/constants/settings-sitemap";

export interface SettingsNavProps {
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * Settings' own grouped left nav. Redesigned away from `AppSidebar`'s
 * bordered icon-rail button chrome (that treatment made sense when every
 * row was an equally-weighted placeholder; now that most sections hold
 * real forms, a flatter list — no per-row border, a colored left accent +
 * soft background only on the active row — reads more like a settings
 * page and less like a second app nav). Not-yet-built sections stay fully
 * navigable (still open the placeholder panel) but render de-emphasized
 * with a muted "Soon" tag, so the six real sections are what the eye lands
 * on first.
 */
export function SettingsNav({ activeKey, onSelect }: SettingsNavProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <nav aria-label="Settings" className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto py-1 pr-2">
      {SETTINGS_SITEMAP.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <div key={group.key} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={!isCollapsed}
              data-testid={`settings-group-${group.key}`}
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : ""}`}
                aria-hidden="true"
              />
            </button>

            {!isCollapsed
              ? group.sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.key === activeKey;
                  const isReady = section.status === "ready";
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => onSelect(section.key)}
                      data-testid={settingsNavTestId(section.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-lg py-2 pr-2.5 pl-3.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-black/[0.05] font-medium text-foreground dark:bg-white/[0.08]"
                          : isReady
                            ? "text-foreground/75 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                            : "text-foreground/45 hover:bg-black/[0.03] hover:text-foreground/65 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full transition-colors ${
                          isActive ? "bg-accent" : "bg-transparent"
                        }`}
                      />
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      {!isReady ? (
                        <span className="shrink-0 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-foreground/40 dark:bg-white/[0.08]">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  );
                })
              : null}
          </div>
        );
      })}
    </nav>
  );
}

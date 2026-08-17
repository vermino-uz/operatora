"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { ChartColumn, Persons, Plus, Sparkles } from "@gravity-ui/icons";

import { CATEGORY_ACCENT, CATEGORY_LABELS, type CustomDashboardRow, type DashboardMeta } from "@/features/dashboards/types";

type Filter = "all" | "sales" | "marketing" | "conversion" | "operators" | "leads";

const FILTERS: Filter[] = ["all", "sales", "marketing", "conversion", "operators", "leads"];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** The dashboard list/grid — reference: old frontend's `components/
 * dashboards/DashboardGrid.tsx`. */
export function DashboardGrid({
  dashboards,
  meta,
  onOpen,
  onCreate,
}: {
  dashboards: CustomDashboardRow[];
  meta?: DashboardMeta;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: dashboards.length };
    for (const d of dashboards) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [dashboards]);

  const filtered = useMemo(
    () => (filter === "all" ? dashboards : dashboards.filter((d) => d.category === filter)),
    [dashboards, filter],
  );

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            AI Dashboards
            <Chip size="sm" color="accent" variant="soft">
              <Chip.Label className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Beta
              </Chip.Label>
            </Chip>
          </h1>
          <p className="mt-1 text-sm text-foreground/60">Ask for a dashboard in plain language — it&apos;s generated from your real data.</p>
        </div>
        <div className="flex items-center gap-3">
          {meta ? (
            <span className="text-xs text-foreground/50">
              {meta.limit === null ? `${meta.used} dashboards` : `${meta.used} / ${meta.limit} dashboards`}
            </span>
          ) : null}
          <Button variant="primary" size="sm" onPress={onCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New dashboard
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
              filter === f ? "bg-foreground text-background" : "bg-black/[0.04] text-foreground/60 hover:text-foreground dark:bg-white/[0.06]"
            }`}
          >
            {f === "all" ? "All" : CATEGORY_LABELS[f]}
            <span className={filter === f ? "opacity-60" : "text-foreground/40"}>{counts[f] || 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04] text-foreground/40 dark:bg-white/[0.06]">
            <ChartColumn className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">No dashboards in this category yet</p>
          <p className="mt-1 text-sm text-foreground/60">Create one from a prompt to get started.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const accent = CATEGORY_ACCENT[d.category] ?? CATEGORY_ACCENT.general;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onOpen(d.id)}
                className="overflow-hidden rounded-2xl border border-black/[0.08] text-left transition-shadow hover:shadow-md dark:border-white/[0.12]"
              >
                <div className="flex h-24 items-center justify-between px-4" style={{ backgroundColor: `${accent}14` }}>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <Sparkles className="h-3 w-3" />
                    {CATEGORY_LABELS[d.category]}
                  </span>
                  {d.shared ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/60">
                      <Persons className="h-3 w-3" />
                      Shared
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="truncate text-sm font-semibold text-foreground">{d.title}</div>
                  <div className="mt-1 line-clamp-2 min-h-[34px] text-xs text-foreground/60">{d.description || "—"}</div>
                  <div className="mt-3 text-[11px] text-foreground/40">
                    {d.spec?.widgets?.length ?? 0} widgets · {formatWhen(d.updated_at)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

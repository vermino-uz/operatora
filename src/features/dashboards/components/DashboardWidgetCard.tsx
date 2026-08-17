"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight } from "@gravity-ui/icons";

import { formatWidgetValue, round1, type ResolvedWidget } from "@/features/dashboards/types";

function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function EmptyBox() {
  return <div className="flex h-[120px] items-center justify-center text-xs text-foreground/40">No data yet</div>;
}

function WidgetCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <div className="mb-2">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle ? <div className="text-xs text-foreground/50">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  accent,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  accent: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg">
      <div className="opacity-60">{label}</div>
      <div className="flex items-center gap-1.5 font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        {Math.round(value).toLocaleString()}
      </div>
    </div>
  );
}

/**
 * Renders one resolved widget by `result.kind` — reference: old frontend's
 * `components/dashboards/DashboardWidget.tsx`, rebuilt on this app's own
 * component conventions. Charts use `recharts` (new dependency — the old
 * frontend's own choice too, and this feature genuinely needs real bar/line
 * charts; no equivalent already exists in this codebase to reuse instead).
 */
export function DashboardWidgetCard({ widget, accent }: { widget: ResolvedWidget; accent: string }) {
  const { result } = widget;

  if (result.kind === "kpi") {
    const { value, deltaPct } = result.data;
    const up = (deltaPct ?? 0) >= 0;
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/60">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <span className="truncate">{widget.title}</span>
        </div>
        <div className="mt-2">
          <div className="text-[28px] font-bold leading-none tabular-nums text-foreground">
            {formatWidgetValue(value, widget.format)}
          </div>
          {deltaPct !== null && deltaPct !== undefined ? (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-success" : "text-danger"}`}
            >
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {up ? "+" : ""}
              {round1(deltaPct)}%
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (result.kind === "series") {
    const data = result.data.map((p) => ({ ...p, name: shortDayLabel(p.label) }));
    const empty = data.every((d) => d.value === 0);
    return (
      <WidgetCard title={widget.title} subtitle={widget.subtitle}>
        {empty ? (
          <EmptyBox />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {widget.type === "line" ? (
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip content={<ChartTooltipContent accent={accent} />} />
                <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} dot={{ r: 2.5, fill: accent }} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltipContent accent={accent} />} />
                <Bar dataKey="value" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </WidgetCard>
    );
  }

  if (result.kind === "breakdown" && widget.type === "funnel") {
    const items = result.data;
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
      <WidgetCard title={widget.title} subtitle={widget.subtitle}>
        {items.length === 0 || items.every((i) => i.value === 0) ? (
          <EmptyBox />
        ) : (
          <div className="space-y-1.5 pt-1">
            {items.map((it, idx) => {
              const w = Math.max(18, (it.value / max) * 100);
              return (
                <div key={`${it.label}-${idx}`} className="flex justify-center">
                  <div
                    className="flex h-8 min-w-0 items-center justify-between rounded-lg px-3 text-xs font-medium text-white"
                    style={{ width: `${w}%`, backgroundColor: accent, opacity: 0.55 + 0.45 * (it.value / max) }}
                    title={`${it.label}: ${Math.round(it.value).toLocaleString()}`}
                  >
                    <span className="truncate">{it.label}</span>
                    <span className="shrink-0 pl-2 tabular-nums">{Math.round(it.value).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetCard>
    );
  }

  if (result.kind === "breakdown") {
    const items = result.data;
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
      <WidgetCard title={widget.title} subtitle={widget.subtitle}>
        {items.length === 0 || items.every((i) => i.value === 0) ? (
          <EmptyBox />
        ) : (
          <div className="space-y-2.5 pt-1">
            {items.map((it, idx) => (
              <div key={`${it.label}-${idx}`}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-foreground">{it.label}</span>
                  <span className="shrink-0 tabular-nums text-foreground/60">
                    {Math.round(it.value).toLocaleString()} <span className="text-foreground/40">· {round1(it.pct)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(3, (it.value / max) * 100)}%`, backgroundColor: accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </WidgetCard>
    );
  }

  if (result.kind === "table") {
    const { columns, rows } = result.data;
    return (
      <WidgetCard title={widget.title} subtitle={widget.subtitle}>
        {rows.length === 0 ? (
          <EmptyBox />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-foreground/40">
                  {columns.map((c) => (
                    <th key={c.key} className={`px-2 py-2 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-black/[0.06] dark:border-white/[0.08]">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-2 py-2 text-foreground ${c.align === "right" ? "text-right tabular-nums text-foreground/60" : "text-left"}`}
                      >
                        {String(row[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title={widget.title}>
      <EmptyBox />
    </WidgetCard>
  );
}

"use client";

import type { ComponentType, SVGProps } from "react";

const TONE_CLASSES: Record<"danger" | "accent" | "default", string> = {
  danger: "text-danger",
  accent: "text-accent",
  default: "text-foreground",
};

export function TaskStatCard({
  label,
  value,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "danger" | "accent" | "default";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06] ${TONE_CLASSES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-foreground/60">{label}</p>
      </div>
    </div>
  );
}

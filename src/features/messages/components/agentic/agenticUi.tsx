"use client";

import type { ReactNode } from "react";
import { Check } from "@gravity-ui/icons";

export function PaneBlock({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-start gap-2">
        {icon ? <span className="mt-0.5 text-[#7C3AED]">{icon}</span> : null}
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {hint ? <p className="mt-0.5 text-xs text-foreground/60">{hint}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function TargetRow({
  title,
  desc,
  selected,
  onClick,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className="flex cursor-pointer items-start gap-3" role="radio" aria-checked={selected}>
      <div className="pt-0.5">
        <RadioDot selected={selected} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        <p className="text-xs text-foreground/60">{desc}</p>
      </div>
    </div>
  );
}

export function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-[#7C3AED]" : "border-black/20 dark:border-white/20"
      }`}
    >
      {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[#7C3AED]" /> : null}
    </span>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left">
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${
          checked ? "border-[#7C3AED] bg-[#7C3AED]" : "border-black/20 bg-[var(--default)] dark:border-white/20"
        }`}
      >
        {checked ? <Check className="size-3 text-white" /> : null}
      </span>
      <span className="text-[13px] text-foreground">{label}</span>
    </button>
  );
}

export function StatusBanner({
  kind,
  message,
}: {
  kind: "success" | "error";
  message: string;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-xs ${
        kind === "error"
          ? "border border-danger/30 bg-danger/10 text-danger"
          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      }`}
    >
      {message}
    </p>
  );
}

export function ChipButton({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "bg-[#7C3AED] text-white" : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        {required ? <span className="text-[11px] text-[#7C3AED]">*</span> : null}
      </div>
      {children}
    </div>
  );
}

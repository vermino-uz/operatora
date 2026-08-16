import type { ReactNode } from "react";

/**
 * Shared per-section chrome: title/subtitle header (+ optional header
 * actions) and a body area. Every real section (General, Notifications,
 * Team Members, Roles & Permissions, Security, Brand) and the placeholder
 * panel render through this so a section's card border/radius/max-width
 * never has to be redecided per-section — see PROGRESS.md's redesign note
 * on establishing one reusable form-layout pattern.
 *
 * `wide` opts a section out of the capped reading-width body (table/matrix
 * heavy sections like Team Members and Roles & Permissions need the full
 * available width; simple field forms read better capped, matching
 * GeneralSettingsForm's original max-width fix).
 */
export function SettingsSectionShell({
  title,
  subtitle,
  actions,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full w-full flex-col rounded-2xl border border-black/[0.08] bg-background dark:border-white/[0.12]">
      <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] px-6 py-5 dark:border-white/[0.12]">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-foreground/60">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      <div className={`flex-1 px-6 py-6 ${wide ? "" : "max-w-[720px]"}`}>{children}</div>
    </div>
  );
}

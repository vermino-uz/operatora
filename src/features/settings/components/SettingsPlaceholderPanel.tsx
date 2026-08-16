import type { SettingsSection } from "@/constants/settings-sitemap";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";

/** Placeholder content for a not-yet-built settings section. Six sections
 * (general, notifications, team-members, roles-permissions, brand,
 * security) render real UI instead — see PROGRESS.md for what's
 * deliberately still deferred and why. */
export function SettingsPlaceholderPanel({ section }: { section: SettingsSection }) {
  const Icon = section.icon;
  return (
    <SettingsSectionShell title={section.label} subtitle={section.subtitle}>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-[16px] border-[1.5px] border-black/[0.08] text-foreground/30 dark:border-white/[0.12]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">Coming soon</p>
        <p className="max-w-sm text-sm text-foreground/50">
          This section isn&apos;t built yet — this is a navigation placeholder so every settings page has a home
          before its real form/integration UI is implemented.
        </p>
      </div>
    </SettingsSectionShell>
  );
}

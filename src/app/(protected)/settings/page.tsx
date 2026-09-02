"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ALL_SETTINGS_SECTIONS, DEFAULT_SETTINGS_SECTION } from "@/constants/settings-sitemap";
import { ROUTES } from "@/constants/routes";
import { SettingsNav, SettingsNavMobile } from "@/features/settings/components/SettingsNav";
import { SettingsPlaceholderPanel } from "@/features/settings/components/SettingsPlaceholderPanel";
import { GeneralSettingsForm } from "@/features/settings/components/GeneralSettingsForm";
import { NotificationsSettingsForm } from "@/features/settings/components/NotificationsSettingsForm";
import { TeamMembersPanel } from "@/features/team/components/TeamMembersPanel";
import { RolesPermissionsPanel } from "@/features/roles/components/RolesPermissionsPanel";
import { SecuritySettingsPanel } from "@/features/security/components/SecuritySettingsPanel";
import { BrandSettingsForm } from "@/features/brand/components/BrandSettingsForm";
import { DepartmentsPanel } from "@/features/departments/components/DepartmentsPanel";
import { StoragePanel } from "@/features/storage/components/StoragePanel";
import { CannedResponsesPanel } from "@/features/canned-responses/components/CannedResponsesPanel";
import { SipConfigPanel } from "@/features/telephony/components/SipConfigPanel";
import { GsmLinesWorkspacePanel } from "@/features/telephony/components/GsmLinesPanel";
import { TelegramSettingsPanel } from "@/features/telegram/components/TelegramSettingsPanel";
import { EskizSettingsPanel } from "@/features/eskiz/components/EskizSettingsPanel";
import { UtelSettingsPanel } from "@/features/utel/components/UtelSettingsPanel";
import { InstagramSettingsPanel } from "@/features/instagram/components/InstagramSettingsPanel";
import { CrmIntegrationsPanel } from "@/features/crm/components/CrmIntegrationsPanel";
import { GoogleSheetsSettingsPanel } from "@/features/google-sheets/components/GoogleSheetsSettingsPanel";
import { GoogleCalendarSettingsPanel } from "@/features/google-calendar/components/GoogleCalendarSettingsPanel";
import { McpKeysPanel } from "@/features/mcp-keys/components/McpKeysPanel";
import { SuperAgentPanel } from "@/features/super-agent/components/SuperAgentPanel";
import { HiggsfieldSettingsPanel } from "@/features/higgsfield/components/HiggsfieldSettingsPanel";
import { LeadAutomationsPanel } from "@/features/lead-automations/components/LeadAutomationsPanel";
import { TaskModuleSettingsPanel } from "@/features/tasks-settings/components/TaskModuleSettingsPanel";
import { BillingSettingsPanel } from "@/features/billing/components/BillingSettingsPanel";

/**
 * Settings shell — redesigned page chrome (title bar above the nav/content
 * split, flatter de-emphasized-placeholder nav — see `SettingsNav.tsx`). All
 * twenty-four sections are now real, wired to their traced backend
 * contracts — this pass added Lead Automations (workspace-wide automation
 * rule engine), Task Management (`/tasks/settings`), and Billing & Usage
 * (plan/usage summary + invoices + payment cards + prepaid balance).
 * `SettingsPlaceholderPanel` is no longer reachable via
 * `READY_SECTION_COMPONENTS` but stays as shared chrome for any future
 * section. `?section=` deep-linking unchanged (matches the old app's
 * `/settings?section=billing` convention), still wrapped in `Suspense` for
 * `useSearchParams` under static generation.
 */
export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageContent />
    </Suspense>
  );
}

const READY_SECTION_COMPONENTS: Record<string, () => React.ReactElement> = {
  general: GeneralSettingsForm,
  notifications: NotificationsSettingsForm,
  "team-members": TeamMembersPanel,
  "roles-permissions": RolesPermissionsPanel,
  brand: BrandSettingsForm,
  security: SecuritySettingsPanel,
  departments: DepartmentsPanel,
  storage: StoragePanel,
  "canned-responses": CannedResponsesPanel,
  "sip-config": SipConfigPanel,
  "gsm-lines": GsmLinesWorkspacePanel,
  telegram: TelegramSettingsPanel,
  eskiz: EskizSettingsPanel,
  utel: UtelSettingsPanel,
  instagram: InstagramSettingsPanel,
  "crm-integrations": CrmIntegrationsPanel,
  "google-sheets": GoogleSheetsSettingsPanel,
  "google-calendar": GoogleCalendarSettingsPanel,
  "claude-chatgpt": McpKeysPanel,
  "super-agent": SuperAgentPanel,
  higgsfield: HiggsfieldSettingsPanel,
  "lead-automations": () => <LeadAutomationsPanel />,
  tasks: TaskModuleSettingsPanel,
  billing: BillingSettingsPanel,
};

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeKey = searchParams.get("section") ?? DEFAULT_SETTINGS_SECTION;
  const activeSection =
    ALL_SETTINGS_SECTIONS.find((s) => s.key === activeKey) ?? ALL_SETTINGS_SECTIONS[0]!;

  function handleSelect(key: string) {
    router.push(`${ROUTES.settings}?section=${key}`, { scroll: false });
  }

  const ReadyComponent = READY_SECTION_COMPONENTS[activeSection.key];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 pt-2">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-foreground/60">
          Manage your workspace, team, and integrations.
        </p>
      </div>

      <SettingsNavMobile activeKey={activeSection.key} onSelect={handleSelect} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
        <SettingsNav activeKey={activeSection.key} onSelect={handleSelect} />
        <div className="min-w-0 flex-1 overflow-y-auto pb-6">
          {ReadyComponent ? <ReadyComponent /> : <SettingsPlaceholderPanel section={activeSection} />}
        </div>
      </div>
    </div>
  );
}

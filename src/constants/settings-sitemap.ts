import {
  Gear,
  Bell,
  Persons,
  Person,
  Shield,
  HardDrive,
  QuoteOpen,
  Handset,
  Smartphone,
  Comment,
  Signal,
  PaperPlane,
  Camera,
  Link,
  Database,
  Calendar,
  PlugConnection,
  FaceRobot,
  Filmstrip,
  Palette,
  Route,
  ListCheck,
  CreditCard,
  Lock,
} from "@gravity-ui/icons";

import type { IconComponent } from "@/constants/sitemap";

/**
 * Settings' own left nav — grouped sections, originally ported from the old
 * frontend's `Settings.tsx` (`navGroups`/`SECTION_META`) and
 * `config/app-sitemap.ts`'s `settingsSections` list, then re-grouped for
 * this app's own IA (see PROGRESS.md's redesign note): each group leads
 * with its `status: "ready"` sections (real form/integration UI) before its
 * `"soon"` ones, the old "Billing" group (a single section) was folded into
 * "Account", and Brand identity moved to the top of Integrations now that
 * it's real. All twenty-four sections are now real — general, notifications,
 * team-members, roles-permissions, brand, security, departments, storage,
 * canned-responses, sip-config, gsm-lines, telegram, eskiz, utel, instagram,
 * crm-integrations, google-sheets, google-calendar, claude-chatgpt,
 * super-agent, higgsfield, lead-automations, tasks, billing — see
 * PROGRESS.md for the traced contract and any per-section deferred items.
 */
export interface SettingsSection {
  key: string;
  label: string;
  subtitle: string;
  icon: IconComponent;
  /** Old app gated these behind the workspace admin roles; carried over as
   * a label only — actual enforcement happens server-side (a non-admin
   * caller gets a 403 from the real endpoint, surfaced via `ErrorState`),
   * this only drives the nav's visual treatment. */
  adminOnly?: boolean;
  /** `"ready"` sections render their real form/integration UI; `"soon"`
   * (the default) still render `SettingsPlaceholderPanel`. Drives the
   * nav's visual de-emphasis of not-yet-built sections — see
   * `SettingsNav.tsx`. */
  status?: "ready" | "soon";
}

export interface SettingsGroup {
  key: string;
  label: string;
  sections: SettingsSection[];
}

export const SETTINGS_SITEMAP: SettingsGroup[] = [
  {
    key: "minimal",
    label: "Essentials",
    sections: [
      {
        key: "general",
        label: "General",
        subtitle: "Configure your workspace name, timezone, and preferences.",
        icon: Gear,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "notifications",
        label: "Notifications",
        subtitle: "Choose which workspace events email and Telegram alerts fire for.",
        icon: Bell,
        adminOnly: true,
        status: "ready",
      },
    ],
  },
  {
    key: "workspace",
    label: "Workspace",
    sections: [
      {
        key: "team-members",
        label: "Team Members",
        subtitle: "Invite teammates, assign roles, and manage access to this workspace.",
        icon: Persons,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "roles-permissions",
        label: "Roles & Permissions",
        subtitle: "Define roles and control access with a permission matrix.",
        icon: Shield,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "departments",
        label: "Departments",
        subtitle: "Route AI-agent escalations to the right staff via Telegram.",
        icon: Person,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "storage",
        label: "File Storage",
        subtitle: "Configure where audio recordings and file attachments are stored.",
        icon: HardDrive,
        status: "ready",
      },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    sections: [
      {
        key: "canned-responses",
        label: "Canned Responses",
        subtitle: "Shortcut replies for Telegram and other channels (e.g. /greeting → Hello there).",
        icon: QuoteOpen,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "sip-config",
        label: "SIP Configuration",
        subtitle: "SIP telephony accounts for every workspace member, in one place.",
        icon: Handset,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "gsm-lines",
        label: "GSM Lines",
        subtitle: "GSM modem lines for SMS and telephony, for every workspace member.",
        icon: Smartphone,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "telegram",
        label: "Telegram",
        subtitle: "Connect your Telegram bot for inbound conversations.",
        icon: PaperPlane,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "eskiz",
        label: "Eskiz SMS",
        subtitle: "Connect your Eskiz account, manage templates, view SMS history and reports.",
        icon: Comment,
        status: "ready",
      },
      {
        key: "utel",
        label: "Utel Integration",
        subtitle: "Connect Utel telephony and SMS for inbound/outbound traffic.",
        icon: Signal,
        status: "ready",
      },
      {
        key: "instagram",
        label: "Instagram",
        subtitle: "Connect Instagram for direct message handling.",
        icon: Camera,
        status: "ready",
      },
    ],
  },
  {
    key: "integration",
    label: "Integrations",
    sections: [
      {
        key: "brand",
        label: "Brand identity",
        subtitle: "Logo, colors and style the AI uses in every generation.",
        icon: Palette,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "crm-integrations",
        label: "CRM Integration",
        subtitle: "Connect Tilda, AMO CRM and Bitrix24 — inbound webhooks and field mapping.",
        icon: Link,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "google-sheets",
        label: "Google Sheets",
        subtitle: "Import leads from a spreadsheet, or export your CRM leads to one.",
        icon: Database,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "google-calendar",
        label: "Google Calendar",
        subtitle: "Connect your own Google account to generate Meet links for scheduled meetings.",
        icon: Calendar,
        status: "ready",
      },
      {
        key: "claude-chatgpt",
        label: "Claude / ChatGPT",
        subtitle: "Connect Claude or ChatGPT via MCP — analyze leads, keep agent data up to date.",
        icon: PlugConnection,
        status: "ready",
      },
      {
        key: "super-agent",
        label: "Super Agent (Hermes)",
        subtitle: "A full-browser autonomous agent that pulls data from Bitrix, ad accounts, and other external services.",
        icon: FaceRobot,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "higgsfield",
        label: "Higgsfield MCP",
        subtitle: "Connect Higgsfield MCP for AI image and video generation.",
        icon: Filmstrip,
        adminOnly: true,
        status: "ready",
      },
    ],
  },
  {
    key: "leadManagement",
    label: "Lead Management",
    sections: [
      {
        key: "lead-automations",
        label: "Lead Automations",
        subtitle: "AI signal and pipeline triggers — auto-move hot leads or assign them to an operator.",
        icon: Route,
        adminOnly: true,
        status: "ready",
      },
      {
        key: "tasks",
        label: "Task Management",
        subtitle: "Enable the tasks module and configure when operators are prompted to create follow-up tasks.",
        icon: ListCheck,
        adminOnly: true,
        status: "ready",
      },
    ],
  },
  {
    key: "account",
    label: "Account & Billing",
    sections: [
      {
        key: "security",
        label: "Security",
        subtitle: "Change password, active sessions, and sign out other devices.",
        icon: Lock,
        status: "ready",
      },
      {
        key: "billing",
        label: "Billing & Usage",
        subtitle: "View your plan, AI usage limits, and subscription status.",
        icon: CreditCard,
        adminOnly: true,
        status: "ready",
      },
    ],
  },
];

export const ALL_SETTINGS_SECTIONS: SettingsSection[] = SETTINGS_SITEMAP.flatMap((g) => g.sections);

export const DEFAULT_SETTINGS_SECTION = ALL_SETTINGS_SECTIONS[0]!.key;

export function settingsNavTestId(key: string): string {
  return `settings-nav-${key}`;
}

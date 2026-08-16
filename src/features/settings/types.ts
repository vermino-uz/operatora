/** `GET /workspace-settings` response — `company`/`notifications` are
 * opaque JSON blobs on the backend (no fixed schema enforced there), so
 * only the fields this feature actually reads/writes are typed; the rest
 * round-trips through `Record<string, unknown>` untouched. */
export interface WorkspaceSettingsResponse {
  workspace_id: string;
  workspace_name: string | null;
  company: Record<string, unknown>;
  notifications: Record<string, unknown>;
}

export const PHONE_FORMAT_OPTIONS = ["+998 XX XXX XX XX", "+7 XXX XXX XX XX"] as const;
export type PhoneFormat = (typeof PHONE_FORMAT_OPTIONS)[number];

export const CURRENCY_OPTIONS = ["UZS", "USD"] as const;
export type Currency = (typeof CURRENCY_OPTIONS)[number];

/** Matches the old frontend's three locale bundles (`src/locales/{uz,ru,en}`)
 * — this new app has no i18n layer of its own yet, but `company.language`
 * is a real backend field consumed elsewhere (e.g. AI Chat's `/ai-chat/v2`
 * request body takes the same `uz`/`ru`/`en` set as a `language` param), so
 * it's worth setting correctly even before any UI here is translated. */
export const LANGUAGE_OPTIONS = ["uz", "ru", "en"] as const;
export type Language = (typeof LANGUAGE_OPTIONS)[number];

export interface GeneralSettingsFormValues {
  workspace_name: string;
  phone_format: PhoneFormat;
  currency: Currency;
  language: Language;
}

/** `PUT /workspace-settings/notifications` body/`GET /workspace-settings`
 * `.notifications` shape — confirmed via the backend controller's own
 * Swagger example (`{ email_new_lead: true, telegram_new_message: true }`),
 * a distinct endpoint from `/company`. The old frontend's much larger
 * `NotificationRulesSettings.tsx` (per-department Telegram routing, a rule
 * builder, a personal Telegram account-link flow via `/notification-rules/*`)
 * is a separate, far bigger system — deliberately not built here, see
 * PROGRESS.md. Only the two documented toggles get real controls; anything
 * else already in the stored blob round-trips untouched. */
export interface WorkspaceNotificationSettings {
  email_new_lead?: boolean;
  telegram_new_message?: boolean;
  [key: string]: unknown;
}

export interface NotificationsFormValues {
  email_new_lead: boolean;
  telegram_new_message: boolean;
}

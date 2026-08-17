/**
 * Ads page (`/ads`) — traced directly from `/www/wwwroot/dev.operatora/app/
 * backend/src/ads/{ads.controller,ads.service,ads.types}.ts` (`/ads/*`,
 * `ads_connections`/`ads_campaigns` tables, Meta Graph API). Real, gated by
 * `@RequireModulePermission('ads', 'view'|'manage')` — matches this app's
 * `ads` RBAC module key (`features/roles/types.ts`'s `PermissionModule`).
 * Money-affecting mutations (`connect`, `budget`, `audience`, `schedule`,
 * `status-set`, `creative-status-set`) are additionally workspace-
 * owner/admin-only *inside the service* (`assertMoneyRole`), independent
 * of the RBAC module gate.
 *
 * The whole module is provider-abstract but only `meta` (Instagram/Facebook
 * ads) is implemented. Real API access requires Meta's "Advanced Access"
 * review (`isMetaAdsEnabled()` / `META_ADS_ENABLED` env flag) — until then
 * `GET /ads/campaigns` returns **sample data** (`sample: true`, every row
 * `isSample: true`), which this UI surfaces honestly (a visible "Sample"
 * badge + banner), never pretending it's live.
 */

export type AdsBillingMode = "managed" | "own";

export interface AdsAudience {
  locations?: string[];
  ageMin?: number | null;
  ageMax?: number | null;
  interests?: string[];
  genders?: Array<"male" | "female">;
}

export interface AdsSchedule {
  startDate?: string | null;
  endDate?: string | null;
  days?: number[];
}

export interface AdsMetrics {
  impressions?: number;
  clicks?: number;
  spend?: number;
  results?: number;
  cpr?: number | null;
}

export interface AdsCreative {
  id: string;
  format: "image" | "video" | "carousel" | string;
  caption: string;
  thumbnailUrl: string | null;
  spend: number;
  impressions?: number;
  clicks?: number;
  results?: number;
  status?: string;
}

export interface AdsCampaign {
  id: string;
  provider: string;
  externalId: string | null;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number;
  currency: string;
  audience: AdsAudience | null;
  schedule: AdsSchedule | null;
  metrics: AdsMetrics | null;
  creatives?: AdsCreative[];
  isSample: boolean;
  updatedAt: string;
}

export interface AdsStatus {
  connected: boolean;
  provider: string;
  billingMode: AdsBillingMode | null;
  status: string;
  liveEnabled: boolean;
  connectedAt: string | null;
  commissionPercent: number;
  pageName: string | null;
  instagramUsername: string | null;
  instagramProfilePictureUrl: string | null;
}

export interface AdAccountOption {
  id: string;
  name: string;
  currency: string;
  business_name?: string | null;
}

export type AdsOAuthCallbackResult =
  | { success: true }
  | { requiresSelection: true; selectionToken: string; options: AdAccountOption[] };

export function formatMoney(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n));
}

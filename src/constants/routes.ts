import { APP_SITEMAP } from "@/constants/sitemap";

/**
 * Top-level nav routes, derived from `constants/sitemap.ts` so the two never
 * drift apart. `login`/`admin`/`doc`/`settings` aren't part of the sitemap
 * (not sidebar nav icons, or not gated the same way) and are added
 * separately below.
 */
const sitemapRoutes = Object.fromEntries(
  APP_SITEMAP.topLevel.map((item) => [item.key, item.path]),
) as Record<(typeof APP_SITEMAP.topLevel)[number]["key"], string>;

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  admin: "/admin",
  doc: "/doc",
  settings: "/settings",
  /** Standalone Meta OAuth popup landing page — see
   * `app/instagram-callback/page.tsx`. Intentionally outside `(protected)`
   * (no `AppShell` chrome for a popup window), but still listed here so
   * `proxy.ts`'s auto-derived protected-prefix list covers it — an
   * unauthenticated visit gets redirected to `/login` before the page
   * even mounts, same UX as every other protected route. */
  instagramCallback: "/instagram-callback",
  /** Standalone Google OAuth popup landing pages — same reasoning as
   * `instagramCallback` above (see `app/google-sheets-callback/page.tsx`,
   * `app/google-calendar-callback/page.tsx`). */
  googleSheetsCallback: "/google-sheets-callback",
  googleCalendarCallback: "/google-calendar-callback",
  /** Standalone Meta OAuth landing page for the Ads "own" billing-mode
   * connect flow — see `app/ads-callback/page.tsx`. Always a full-page
   * redirect (never a popup, unlike Instagram), same outside-`(protected)`
   * reasoning as the callbacks above. */
  adsCallback: "/ads-callback",
  /** `/operator-feedbacks` — a personal "my feedback" page (operator role
   * only), deliberately not in `constants/sitemap.ts`/the sidebar, same as
   * the old frontend (no nav link there either — see
   * `features/operators/permissions.ts`). Still listed here so `proxy.ts`'s
   * auto-derived protected-prefix list covers it, same reasoning as the
   * OAuth callbacks above. */
  operatorFeedbacks: "/operator-feedbacks",
  ...sitemapRoutes,
} as const;

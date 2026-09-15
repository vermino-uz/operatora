/**
 * `/pricing` plan copy — ported verbatim (English locale) from the old
 * frontend's `locales/en/billing.json` (`pricing.*`), the same content
 * `Pricing.tsx` actually renders.
 *
 * Important, confirmed-by-reading finding: the old `Pricing.tsx` does
 * **not** call `GET /billing/plans` at all (that endpoint is also
 * JWT-guarded server-side — `BillingController` is `@UseGuards(JwtAuthGuard)`
 * at the class level — so it couldn't work on an unauthenticated pricing
 * page anyway). Pro/Max/Corporate/Free pricing, features, and copy are
 * static marketing content baked into the old frontend's i18n bundle, not a
 * dynamic plans list. This file is the equivalent static data source for
 * this rebuild — not a fabricated substitute for a real API that doesn't
 * exist for this page. The one real API call this page *does* make is
 * `GET /billing/me` (via `useBillingFeaturesQuery`), for the
 * authenticated-user "current plan" banner/CTA state.
 */

export type BillingCycle = "monthly" | "yearly";
export type PlanKey = "free" | "pro" | "max" | "corporate";

export interface PlanFeature {
  text: string;
  strong?: boolean;
  muted?: boolean;
  highlight?: boolean;
  subtitle?: string;
  pill?: string;
  pillTone?: "mint" | "amber" | "muted";
}

export interface PlanContent {
  key: PlanKey;
  name: string;
  badge?: string;
  tagline: string;
  /** `null` for plans whose price varies by billing cycle — resolved via
   * `displayPrice()` below instead. */
  price: string | null;
  priceSuffix: string;
  ctaAuthed: string;
  ctaGuest: string;
  features: PlanFeature[];
}

export const PRICING_BADGE = "PRICING · 7-DAY MONEY-BACK GUARANTEE";
export const HERO_TITLE = "Choose the plan that fits your business.";
export const HERO_SUBTITLE =
  "Start with Pro or upgrade to Max — full refund within 7 days if you're not satisfied. Cancel anytime.";

export const DISPLAY_PRICES: Record<"pro" | "max", Record<BillingCycle, string>> = {
  pro: { monthly: "99k", yearly: "79k" },
  max: { monthly: "990k", yearly: "790k" },
};

export const OPERATOR_ADDON: Record<"pro" | "max", Record<BillingCycle, string>> = {
  pro: { monthly: "+99,000 UZS/month", yearly: "+79,000 UZS/month" },
  max: { monthly: "+990,000 UZS/month", yearly: "+790,000 UZS/month" },
};

export const PRICE_SUFFIX: Record<BillingCycle, string> = {
  monthly: "UZS / month",
  yearly: "UZS / month (annual)",
};

export function displayPrice(plan: "pro" | "max", cycle: BillingCycle): string {
  return DISPLAY_PRICES[plan][cycle];
}

export const PLAN_PRO: PlanContent = {
  key: "pro",
  name: "Pro",
  tagline: "For growing businesses — with 7-day guarantee.",
  price: null,
  priceSuffix: "",
  ctaAuthed: "Upgrade to Pro now",
  ctaGuest: "Choose Pro plan",
  features: [
    { text: "10,000 calls / month", strong: true },
    { text: "50 GB storage · 365-day retention" },
    { text: "Telegram, SMS" },
    { text: "4 AI dashboards · real-time" },
    { text: "30 image generations / month" },
    { text: "Higgsfield MCP", pill: "Soon", pillTone: "amber", muted: true },
    { text: "1 Admin + 1 Operator" },
  ],
};

export const PLAN_MAX: PlanContent = {
  key: "max",
  name: "Max",
  badge: "POPULAR",
  tagline: "Full automation — with Agentic Mode.",
  price: null,
  priceSuffix: "",
  ctaAuthed: "Upgrade to Max now",
  ctaGuest: "Choose Max plan",
  features: [
    {
      text: "Agentic Mode",
      pill: "EARLY ACCESS",
      subtitle: "An AI agent that works on your behalf — the heart of Operatora.",
      highlight: true,
    },
    { text: "50,000 calls / month", strong: true },
    { text: "200 GB storage · unlimited retention" },
    { text: "Telegram, Instagram, WhatsApp, SMS" },
    { text: "Unlimited AI dashboards · real-time" },
    { text: "1,000 image generations / month" },
    { text: "Higgsfield MCP", pill: "Soon", pillTone: "amber", muted: true },
    { text: "1 Admin + 3 Operators" },
  ],
};

export const PLAN_CORPORATE: PlanContent = {
  key: "corporate",
  name: "Corporate",
  tagline: "For enterprises — SIM/SIP and dedicated server.",
  price: "Contact us",
  priceSuffix: "— free demo",
  ctaAuthed: "Contact us",
  ctaGuest: "Contact us",
  features: [
    { text: "Unlimited calls", strong: true },
    { text: "500 GB+ storage · unlimited retention" },
    { text: "Custom prompts · brand integration" },
    { text: "Unlimited image generation" },
    { text: "Higgsfield MCP", pill: "Unlimited Access", pillTone: "mint" },
    { text: "SIM/SIP support" },
    { text: "Dedicated server + SLA" },
    { text: "Personal manager + onboarding" },
  ],
};

export const PLAN_FREE: PlanContent = {
  key: "free",
  name: "Free",
  tagline: "For solo sellers and beginners.",
  price: "0 UZS",
  priceSuffix: "/ forever",
  ctaAuthed: "Current plan",
  ctaGuest: "Start for free",
  features: [
    { text: "100 calls / month", strong: true },
    { text: "500 MB storage · 30-day retention" },
    { text: "Basic AI analysis" },
    { text: "1 AI dashboard" },
    { text: "Image generation" },
    { text: "Higgsfield MCP" },
    { text: "1 Admin user" },
  ],
};

export function normalizePlanSlug(value?: string | null): PlanKey {
  const slug = (value ?? "free").toLowerCase();
  if (slug === "corporate" || slug === "enterprise") return "corporate";
  if (slug === "max") return "max";
  if (slug === "pro" || slug === "team" || slug === "business") return "pro";
  return "free";
}

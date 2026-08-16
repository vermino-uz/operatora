import { Camera, Comment, LogoTelegram } from "@gravity-ui/icons";

import type { IconComponent } from "@/constants/sitemap";

/**
 * `connected_channels` values (from `attachConnectedChannels()` in the
 * backend's `lead-channels-overlay.ts`) are exactly `telegram` / `instagram`
 * / `whatsapp` / `sms` — no others. `@gravity-ui/icons` has real logo marks
 * for Telegram only; Instagram reuses the same `Camera` icon already
 * established for the Instagram settings section (`constants/settings-sitemap.ts`),
 * WhatsApp/SMS fall back to a generic chat-bubble icon since no matching
 * logo mark exists in this icon set.
 */
export const CHANNEL_ICONS: Record<string, IconComponent> = {
  telegram: LogoTelegram,
  instagram: Camera,
  whatsapp: Comment,
  sms: Comment,
};

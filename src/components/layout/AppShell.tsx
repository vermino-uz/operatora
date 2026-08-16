"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";

/**
 * Authenticated app shell: icon-rail sidebar (left, full height) + a banner
 * slot + scrollable main content. Mirrors the old frontend's
 * `DashboardLayout.tsx` composition — sidebar + main only, no separate
 * topbar (the old app has none either; user/account info lives in the
 * sidebar's profile menu instead, see `AppSidebar.tsx`).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Banner slot — impersonation / tariff-expiry banners in the old
            app (`ImpersonationBanner`, `TariffExpiryBanner`). Not wired up
            yet: no data source for either on this frontend (out of scope
            for the nav shell pass, see PROGRESS.md). */}
        {/* <BannerSlot /> */}

        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

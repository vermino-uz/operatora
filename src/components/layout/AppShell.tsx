"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GlobalAudioProvider } from "@/features/audio/GlobalAudioProvider";
import { GlobalAudioPlayer } from "@/features/audio/GlobalAudioPlayer";

/**
 * Authenticated app shell: icon-rail sidebar (left, full height) + a banner
 * slot + scrollable main content. Mirrors the old frontend's
 * `DashboardLayout.tsx` composition — sidebar + main only, no separate
 * topbar (the old app has none either; user/account info lives in the
 * sidebar's profile menu instead, see `AppSidebar.tsx`).
 *
 * Below `md`, the sidebar is hidden and `MobileBottomNav` provides primary
 * navigation (settings replaces the desktop profile menu for account access).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <GlobalAudioProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden">
        <div className="hidden shrink-0 md:block">
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
            {children}
          </main>
        </div>

        <MobileBottomNav />
        <GlobalAudioPlayer />
      </div>
    </GlobalAudioProvider>
  );
}

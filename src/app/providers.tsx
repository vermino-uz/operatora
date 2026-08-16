"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { createQueryClient } from "@/services/api/query-client";
import { registerForceLogoutHandler } from "@/services/api/client";
import { useSessionStore } from "@/state/session-store";

/**
 * Wires the API client's forced-logout callback (401-refresh-failure /
 * SESSION_SUPERSEDED — see ARCHITECTURE.md Auth section) to the session
 * store + a redirect to /login. Lives inside the QueryClientProvider tree
 * so it can also clear the query cache.
 */
function ForceLogoutBridge() {
  const router = useRouter();
  const clear = useSessionStore((s) => s.clear);

  useEffect(() => {
    registerForceLogoutHandler(() => {
      clear();
      router.replace("/login");
    });
  }, [clear, router]);

  return null;
}

/** Registers the installability-only service worker (public/sw.js — no
 * offline caching, see its own comment). Best-effort: browsers without
 * support just skip it, and a failed registration shouldn't ever affect
 * the app itself. */
function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — installability is a nice-to-have, never worth
      // surfacing an error for.
    });
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per mount (per browser tab), never module-scope — see
  // services/api/query-client.ts.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ForceLogoutBridge />
        <ServiceWorkerRegistration />
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

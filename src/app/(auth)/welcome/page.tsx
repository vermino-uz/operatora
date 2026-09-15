import { Suspense } from "react";

import { WelcomePageContent } from "@/features/onboarding/components/WelcomePageContent";
import { LoadingState } from "@/components/shared/LoadingState";

export const metadata = { title: "Welcome — Operatora" };

export default function WelcomePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-svh" />}>
      <WelcomePageContent />
    </Suspense>
  );
}

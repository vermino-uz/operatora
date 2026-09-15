import { Suspense } from "react";

import { PricingPageContent } from "@/features/billing/components/PricingPageContent";

export const metadata = { title: "Pricing — Operatora" };

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageContent />
    </Suspense>
  );
}

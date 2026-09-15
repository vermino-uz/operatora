import { Suspense } from "react";

import { CheckoutPageContent } from "@/features/checkout/components/CheckoutPageContent";
import { LoadingState } from "@/components/shared/LoadingState";

export const metadata = { title: "Checkout — Operatora" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading checkout…" className="min-h-svh" />}>
      <CheckoutPageContent />
    </Suspense>
  );
}

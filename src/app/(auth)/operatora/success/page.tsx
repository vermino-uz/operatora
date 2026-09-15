import { Suspense } from "react";

import { PaymentSuccessPageContent } from "@/features/onboarding/components/PaymentSuccessPageContent";
import { LoadingState } from "@/components/shared/LoadingState";

export const metadata = { title: "Payment successful — Operatora" };

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-svh" />}>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}

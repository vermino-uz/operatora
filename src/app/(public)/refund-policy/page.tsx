import { LegalPage } from "@/features/legal/components/LegalPage";
import { REFUND_CONTENT } from "@/features/legal/legalContent";

// Alias of `/refund` — see `privacy-policy/page.tsx` for why this is a thin
// duplicate route instead of a redirect.
export const metadata = { title: "Refund Policy — Operatora" };

export default function RefundPolicyPage() {
  return <LegalPage content={REFUND_CONTENT} />;
}

import { LegalPage } from "@/features/legal/components/LegalPage";
import { TERMS_CONTENT } from "@/features/legal/legalContent";

// Alias of `/terms` — see `privacy-policy/page.tsx` for why this is a thin
// duplicate route instead of a redirect.
export const metadata = { title: "Terms of Service — Operatora" };

export default function TermsOfUsePage() {
  return <LegalPage content={TERMS_CONTENT} />;
}

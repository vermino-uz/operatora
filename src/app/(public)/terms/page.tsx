import { LegalPage } from "@/features/legal/components/LegalPage";
import { TERMS_CONTENT } from "@/features/legal/legalContent";

export const metadata = { title: "Terms of Service — Operatora" };

export default function TermsPage() {
  return <LegalPage content={TERMS_CONTENT} />;
}

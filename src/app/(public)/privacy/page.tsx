import { LegalPage } from "@/features/legal/components/LegalPage";
import { PRIVACY_CONTENT } from "@/features/legal/legalContent";

export const metadata = { title: "Privacy Policy — Operatora" };

export default function PrivacyPage() {
  return <LegalPage content={PRIVACY_CONTENT} />;
}

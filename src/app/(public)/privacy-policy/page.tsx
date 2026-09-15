import { LegalPage } from "@/features/legal/components/LegalPage";
import { PRIVACY_CONTENT } from "@/features/legal/legalContent";

// Alias of `/privacy` — the old app registered both paths for the same
// page (`App.tsx`: `/privacy` and `/privacy-policy` both render
// `PrivacyPolicy`). Kept as a thin duplicate route rather than a redirect
// so both URLs render instantly (no extra round trip) and both work if
// deep-linked/bookmarked.
export const metadata = { title: "Privacy Policy — Operatora" };

export default function PrivacyPolicyPage() {
  return <LegalPage content={PRIVACY_CONTENT} />;
}

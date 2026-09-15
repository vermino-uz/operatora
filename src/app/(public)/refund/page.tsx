import { LegalPage } from "@/features/legal/components/LegalPage";
import { REFUND_CONTENT } from "@/features/legal/legalContent";

export const metadata = { title: "Refund Policy — Operatora" };

export default function RefundPage() {
  return <LegalPage content={REFUND_CONTENT} />;
}

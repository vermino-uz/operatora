import type { Metadata } from "next";

import { TariffsPageContent } from "@/features/admin/components/TariffsPageContent";

export const metadata: Metadata = { title: "Tariffs" };

export default function AdminTariffsPage() {
  return <TariffsPageContent />;
}

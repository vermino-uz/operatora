import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPageContent } from "@/features/auth/components/LoginPageContent";

export const metadata: Metadata = { title: "Sign in" };

// Don't statically cache this page — a long-lived HTML cache was still
// handing browsers the old form + widget layout after deploy.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

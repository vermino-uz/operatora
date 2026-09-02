import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPageContent } from "@/features/auth/components/LoginPageContent";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

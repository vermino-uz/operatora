import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpPageContent } from "@/features/auth/components/SignUpPageContent";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}

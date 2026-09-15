"use client";

import { AuthSplitShell } from "@/features/auth/components/AuthSplitShell";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export function SignUpPageContent() {
  return (
    <AuthSplitShell mode="signup">
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[32px]">
          Create your account
        </h2>
        <p className="text-[14px] leading-[1.5] text-muted">
          Verify your phone and start with a workspace in minutes.
        </p>
      </div>
      <SignUpForm />
    </AuthSplitShell>
  );
}

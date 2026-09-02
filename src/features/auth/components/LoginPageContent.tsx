"use client";

import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginHeroVisual } from "@/features/auth/components/LoginHeroVisual";

export function LoginPageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <AuthPageContainer className="flex flex-1 items-start py-6 md:py-8 lg:py-10">
        <main className="grid w-full grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1.2fr)] md:gap-8 lg:gap-10 xl:grid-cols-[minmax(0,24rem)_minmax(0,1.35fr)] xl:gap-12">
          <div className="flex w-full max-w-md flex-col md:max-w-none md:pt-1">
            <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-background shadow-[0_20px_60px_0_color-mix(in_srgb,var(--foreground)_14%,transparent)] dark:border-white/[0.1]">
              <div className="border-b border-black/[0.06] bg-[var(--surface-secondary)] px-5 py-3 dark:border-white/[0.08] md:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  AI operator platform
                </p>
                <h1 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.65rem]">
                  Run your customer ops with AI
                </h1>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground/60">
                  Leads, conversations, and sales in one workspace.
                </p>
              </div>

              <div className="px-5 py-6 md:px-6 md:py-7">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-foreground">Sign in</h2>
                  <p className="mt-0.5 text-sm text-foreground/50">Continue to your workspace</p>
                </div>
                <LoginForm />
              </div>
            </div>
          </div>

          <div className="md:pt-1">
            <LoginHeroVisual />
          </div>
        </main>
      </AuthPageContainer>
    </div>
  );
}

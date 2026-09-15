import type { ReactNode } from "react";
import Link from "next/link";

import { AuthCursorGlow } from "@/features/auth/components/AuthCursorGlow";
import { OperatoraWordmark } from "@/features/auth/components/OperatoraMark";
import { ROUTES } from "@/constants/routes";

const STATS = [
  { value: "2.4×", label: "Faster replies" },
  { value: "84%", label: "Conversion lift" },
  { value: "1.2k+", label: "Active operators" },
] as const;

const LEGAL = [
  { href: "https://operatora.ai/privacy", label: "Privacy" },
  { href: "https://operatora.ai/terms", label: "Terms" },
  { href: "https://operatora.ai/refund", label: "Refund" },
  { href: "https://operatora.uz", label: "Help" },
] as const;

export function AuthSplitShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: ReactNode;
}) {
  const isLogin = mode === "login";

  return (
    <div data-auth-layout="split" className="flex min-h-svh w-full flex-col overflow-x-hidden bg-background lg:flex-row">
      {isLogin ? <AuthCursorGlow /> : null}
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-background px-8 py-10 sm:px-12 lg:w-1/2 lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[180px] left-[33%] size-[680px] rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, color-mix(in oklch, var(--accent) 34%, transparent) 0%, color-mix(in oklch, var(--accent) 12%, transparent) 35%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[120px] top-[520px] size-[420px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 75%)",
            filter: "blur(24px)",
          }}
        />

        <div className="relative z-10">
          <OperatoraWordmark />
        </div>

        <div className="relative z-10 flex max-w-[560px] flex-col gap-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-foreground/12 bg-foreground/[0.06] px-3.5 py-2">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.48px] text-foreground">
              AI operator platform
            </span>
          </span>
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-foreground sm:text-[52px] lg:text-[64px]">
            Run your customer
            <br />
            ops with AI.
          </h1>
          <p className="max-w-[34rem] text-[15px] leading-[1.6] text-muted sm:text-base">
            Leads, conversations, and sales in one place — work in real time and move faster with AI.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex flex-wrap gap-x-10 gap-y-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-foreground tabular-nums sm:text-[32px]">
                  {stat.value}
                </p>
                <p className="mt-2 text-[13px] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="font-medium tracking-[0.24px] text-muted">SSL encrypted · PCI-DSS</span>
            </div>
            <p className="text-muted/80">© {new Date().getFullYear()} Operatora LLC</p>
          </div>
        </div>
      </section>

      <section className="relative flex flex-1 flex-col gap-8 bg-[color-mix(in_oklch,var(--background)_82%,var(--surface)_18%)] px-6 pb-8 pt-6 sm:px-12 lg:w-1/2 lg:px-14">
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <span className="hidden text-[13px] text-muted sm:inline">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <Link
            href={isLogin ? ROUTES.signup : ROUTES.login}
            className="inline-flex items-center rounded-full bg-accent px-[22px] py-3 text-[13px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95"
          >
            {isLogin ? "Create account" : "Sign in"}
          </Link>
          <a
            href="https://operatora.ai/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center rounded-full border border-foreground/22 px-[22px] py-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.04] sm:inline-flex"
          >
            Book a demo
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-[480px] flex-col gap-6 rounded-[28px] border border-foreground/[0.06] bg-[color-mix(in_oklch,var(--surface)_78%,var(--background)_22%)] p-8 shadow-[0px_24px_60px_-10px_rgba(0,0,0,0.4)] sm:p-10">
            {children}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-muted">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium" aria-label="Legal">
            {LEGAL.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <span className="font-medium tracking-[0.24px]">All services operational</span>
          </div>
        </div>
      </section>
    </div>
  );
}

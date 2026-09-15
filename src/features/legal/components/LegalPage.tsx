"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@gravity-ui/icons";

import { OperatoraMark } from "@/features/auth/components/OperatoraMark";
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, type LegalPageContent } from "@/features/legal/legalContent";

/**
 * Shared shell for `/privacy`, `/terms`, `/refund` (and their `-policy`/
 * `-of-use` aliases) — content/structure ported from the old app's
 * `PrivacyPolicy.tsx`/`Terms.tsx`/`Refund.tsx` (read-only reference), the
 * old dark-teal legal-page palette swapped for this project's own `dark`
 * theme tokens (see `(auth)/layout.tsx` for the same `dark`-forced-shell
 * pattern) rather than hardcoded hex colors. Static content — no
 * loading/error/empty states needed (no network fetch).
 */
export function LegalPage({ content }: { content: LegalPageContent }) {
  const router = useRouter();

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12 lg:px-16">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <OperatoraMark className="size-7 text-accent" />
      </header>

      <main className="px-6 pb-16 sm:px-12 lg:px-16">
        <div className="mx-auto flex max-w-[820px] flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-foreground/[0.12] bg-foreground/[0.06] px-3 text-[11px] font-semibold tracking-[0.06em] text-accent">
              {content.badge}
            </span>
            <h1 className="text-[36px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[44px]">
              {content.title}
            </h1>
            <p className="text-[14px] text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
          </div>

          {content.highlight ? (
            <div className="flex flex-col gap-3 rounded-[20px] border border-accent/30 bg-accent/10 px-7 py-6">
              <span className="text-[11px] font-semibold tracking-[0.06em] text-accent">
                {content.highlight.badge}
              </span>
              <p className="text-[16px] font-semibold leading-[1.5] text-foreground">{content.highlight.title}</p>
              <p className="text-[14px] leading-[1.7] text-muted">{content.highlight.body}</p>
            </div>
          ) : null}

          {content.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground sm:text-[22px]">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-[14px] leading-[1.7] text-muted">
                {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                {section.items?.length ? (
                  <ul className="list-disc space-y-2 pl-6">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {section.orderedItems?.length ? (
                  <ol className="list-decimal space-y-2 pl-6">
                    {section.orderedItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                {section.trailingParagraphs?.map((p) => <p key={p}>{p}</p>)}
                {section.showContact ? (
                  <ul className="list-disc space-y-1 pl-6">
                    <li>Email: {LEGAL_CONTACT.email}</li>
                    <li>Phone: {LEGAL_CONTACT.phone}</li>
                    <li>Address: {LEGAL_CONTACT.address}</li>
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-foreground/[0.08]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-6 py-6 sm:flex-row sm:items-center sm:px-12 lg:px-16">
        <span className="text-[12px] text-muted">© {new Date().getFullYear()} Operatora LLC</span>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-medium text-muted">
          <a href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </a>
          <a href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </a>
          <a href="/refund" className="transition-colors hover:text-foreground">
            Refund Policy
          </a>
          <a href={`mailto:${LEGAL_CONTACT.email}`} className="transition-colors hover:text-foreground">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}

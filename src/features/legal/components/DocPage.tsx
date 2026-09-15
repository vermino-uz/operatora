"use client";

import type { ReactNode } from "react";

/**
 * `/doc` — public user guide, no login required (mirrors the old app's
 * `Doc.tsx`, which sits outside its protected route tree — see
 * `ARCHITECTURE.md` Part 1 "Pages/Routes"). Also linked from the logged-in
 * sidebar (`AppSidebar.tsx`'s `ROUTES.doc`), so this works for both an
 * anonymous visitor and a signed-in user.
 *
 * Content/structure ported from the old app's `Doc.tsx` (read-only
 * reference at `/www/wwwroot/dev.operatora`), translated to English (the
 * rest of this app is English-only; the old copy was hardcoded Uzbek, not
 * driven by its i18n layer) and restyled with this project's own design
 * tokens. The old page embedded ~12 live product screenshots
 * (`/doc/*.webp`) — those assets don't exist in this project and are not
 * fabricated here; each section instead gets a short, text-only feature
 * summary. Static content only — no data fetching, so no loading/error/
 * empty states are needed.
 */

interface DocSection {
  num: string;
  id: string;
  title: string;
  subtitle: string;
  points: { title: string; body: string }[];
}

const SECTIONS: DocSection[] = [
  {
    num: "01",
    id: "getting-started",
    title: "Getting started",
    subtitle:
      "Create an account with your email or phone number in under a minute. No card required, and the Pro plan carries a 7-day money-back guarantee.",
    points: [
      { title: "Sign up", body: "Name, email or phone, business type, and a password — one step." },
      { title: "Pick a plan", body: "Pro or Max, monthly or annual (−20% yearly). Skip and try free first." },
      { title: "Workspace is ready", body: "Sign-up automatically creates your workspace, owner role, and starter settings." },
    ],
  },
  {
    num: "02",
    id: "ai-dashboard",
    title: "AI Dashboard — just ask",
    subtitle:
      "The home screen is a chat with your own workspace data. Ask about leads, calls, or operators and get an answer built from your numbers.",
    points: [
      { title: "Ask anything", body: '"How many new leads came in this week?" — voice input works too.' },
      { title: "Modes", body: "Performance · Conversations · Leads · Agent Mode, or leave it on Auto." },
      { title: "History", body: "Past conversations are saved and searchable in the side panel." },
    ],
  },
  {
    num: "03",
    id: "leads",
    title: "Leads — your sales pipeline",
    subtitle:
      "Every customer is a card on a Kanban board: phone, stage, AI interest score, and deadline. Drag a card forward — automation handles the rest.",
    points: [
      { title: "Add a lead", body: "Name and phone number is enough. Bulk import from Excel, export any time." },
      { title: "Move through stages", body: "Customize your own columns; drag and drop between them." },
      { title: "Sort by AI score", body: "Every lead gets an interest percentage — the hottest leads float to the top." },
      { title: "Automate", body: "Trigger an SMS on stage change, or a reminder when a deadline passes." },
    ],
  },
  {
    num: "04",
    id: "conversations",
    title: "Every call — analyzed automatically",
    subtitle: "Calls are recorded automatically; AI prepares a transcript, a score, and a summary. You just read the result.",
    points: [
      { title: "AI Score", body: "An overall call-quality score — greeting, needs discovery, offer, close." },
      { title: "Sentiment & disposition", body: "Customer mood (positive/neutral/negative) and outcome (callback, sold, declined)." },
      { title: "Summary & key points", body: "A 2–3 sentence summary plus bullet highlights — no need to listen to the full call." },
      { title: "Link to lead & operator", body: "Attach any call to its lead and operator with one click." },
    ],
  },
  {
    num: "05",
    id: "messages",
    title: "Messages — every channel, one AI agent",
    subtitle: "Telegram, Instagram, WhatsApp, and SMS in a single inbox. The AI Agent can reply on your behalf, in text or voice.",
    points: [
      { title: "Full-auto mode", body: "The agent answers every new message; tune what share get a voice reply." },
      { title: "Take over any time", body: "Jump into a conversation — the agent pauses and every message is tagged Human/Agent." },
      { title: "Exclude a contact", body: "Keep a specific customer human-only, no AI replies at all." },
      { title: "Auto-create leads", body: "A new inbound contact automatically becomes a lead in your pipeline." },
    ],
  },
  {
    num: "06",
    id: "settings",
    title: "Settings & integrations",
    subtitle: "Everything about your workspace lives in Settings: team, telephony, SMS, channels, data, and security.",
    points: [
      { title: "Team & roles", body: "Invite members, assign owner/manager/operator roles and permissions." },
      { title: "SIP & GSM", body: "Per-operator SIP accounts, GSM lines, and telephony integration." },
      { title: "Channels", body: "Connect Telegram and Instagram — the inbox and AI Agent turn on from here." },
      { title: "Billing & security", body: "Plan, payments, storage, API keys, and account security." },
    ],
  },
  {
    num: "07",
    id: "mcp",
    title: "Claude & ChatGPT (MCP)",
    subtitle:
      "Operatora runs its own MCP server — connect your Claude or ChatGPT account to your workspace and work with your CRM data from there.",
    points: [
      { title: "Create a key", body: "Settings → Claude & ChatGPT — generate an API key (shown once, keep it safe)." },
      { title: "Connect", body: "Claude: Settings → Connectors → Add custom connector. ChatGPT: Settings → Connectors." },
      { title: "Ask away", body: '"Show this week\'s leads", "Add a new lead: Aziz, +998…" — the AI works directly with your CRM.' },
    ],
  },
];

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-foreground/[0.06] px-3.5 py-2 text-[12px] font-bold tracking-[0.09em] text-accent">
      {children}
    </span>
  );
}

function SectionHero({ num, title, subtitle }: { num: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Badge>{`SECTION ${num}`}</Badge>
      <h2 className="text-4xl leading-[1.08] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className="max-w-3xl text-base leading-[1.5] text-foreground/70 sm:text-lg">{subtitle}</p>
    </div>
  );
}

export function DocPage() {
  return (
    <div className="min-h-svh scroll-smooth bg-background text-foreground">
      {/* HERO */}
      <section className="border-b border-foreground/[0.08] px-6 pt-16 pb-20 lg:px-24">
        <div className="mb-12 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.09em] text-muted">OPERATORA · USER GUIDE</span>
          <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold tracking-[0.09em] text-accent-foreground">
            v3
          </span>
        </div>
        <Badge>GUIDE · 2026</Badge>
        <h1 className="mt-6 max-w-5xl text-5xl leading-[1.05] font-black tracking-tight sm:text-6xl lg:text-7xl">
          How does Operatora work?
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/70 sm:text-xl">
          Leads, calls, and messages — all powered by AI, in one place. Every module below is explained
          step by step.
        </p>
        <div className="mt-12 flex flex-wrap gap-12">
          {[
            { n: "7", l: "Sections" },
            { n: "20+", l: "Features" },
            { n: "100%", l: "English" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-5xl font-black text-accent sm:text-6xl">{s.n}</div>
              <div className="mt-1 text-xs tracking-wider text-muted uppercase">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TOC */}
      <section className="border-b border-foreground/[0.08] px-6 py-16 lg:px-24">
        <p className="text-[11px] font-bold tracking-[0.09em] text-accent">CONTENTS</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">7 sections — the full roadmap</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="group rounded-2xl border border-foreground/[0.08] bg-foreground/[0.02] p-6 transition-all hover:border-accent/40 hover:bg-foreground/[0.04]"
            >
              <div className="text-3xl font-black text-accent/60">{s.num}</div>
              <h3 className="mt-3 text-base font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/60">{s.subtitle}</p>
            </a>
          ))}
        </div>
      </section>

      {SECTIONS.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-6 border-b border-foreground/[0.08] px-6 py-20 lg:px-24 ${
            i % 2 === 1 ? "bg-foreground/[0.02]" : ""
          }`}
        >
          <SectionHero num={section.num} title={section.title} subtitle={section.subtitle} />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {section.points.map((p) => (
              <div key={p.title} className="rounded-2xl border border-foreground/[0.08] p-5">
                <p className="text-[15px] font-bold text-foreground">{p.title}</p>
                <p className="mt-2 text-[13px] leading-[1.55] text-foreground/60">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="px-6 py-20 lg:px-24">
        <p className="text-[11px] font-bold tracking-[0.09em] text-muted">READY — GET STARTED</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
          Run your business on Operatora.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/70">
          Questions? Message @operatora_support on Telegram — we reply fast.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://operatora.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:brightness-95"
          >
            operatora.ai
          </a>
          <a
            href="https://t.me/operatora_support"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.16] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            @operatora_support
          </a>
        </div>
      </section>
    </div>
  );
}

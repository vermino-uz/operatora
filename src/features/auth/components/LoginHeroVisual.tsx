"use client";

import { useEffect, useState } from "react";
import {
  Comment as InboxIcon,
  LayoutHeaderCells as AnalyticsIcon,
  Target as PipelineIcon,
  Sparkles,
} from "@gravity-ui/icons";

type HeroView = "inbox" | "pipeline" | "analytics";

type Thread = {
  id: string;
  name: string;
  channel: string;
  preview: string;
  time: string;
  unread?: number;
  ai?: boolean;
  messages: Array<{ id: string; from: "customer" | "operator" | "ai"; text: string; time: string }>;
  aiDraft?: string;
};

const THREADS: Thread[] = [
  {
    id: "mn",
    name: "M. N.",
    channel: "Telegram",
    preview: "Qaysi yo'nalish qiziq?",
    time: "2m",
    unread: 2,
    aiDraft:
      "Bizda dasturlash, dizayn va marketing kurslari mavjud. Qaysi yo'nalish sizga qiziq?",
    messages: [
      {
        id: "1",
        from: "customer",
        text: "Assalomu alaykum, qaysi kurslar bor?",
        time: "05:28 PM",
      },
      {
        id: "2",
        from: "operator",
        text: "Salom! Sizga mos yo'nalishlarni tavsiya qila olaman.",
        time: "05:29 PM",
      },
    ],
  },
  {
    id: "adapt",
    name: "Adapt Academy",
    channel: "Telegram",
    preview: "Rahmat, ko'rib chiqamiz",
    time: "14m",
    messages: [
      {
        id: "1",
        from: "customer",
        text: "Narxlarni yuboring iltimos.",
        time: "04:12 PM",
      },
      {
        id: "2",
        from: "operator",
        text: "Albatta — PDF hozir jo'nataman.",
        time: "04:13 PM",
      },
    ],
  },
  {
    id: "haad",
    name: "Haad Info",
    channel: "Telegram",
    preview: "Agent draft ready",
    time: "1h",
    ai: true,
    aiDraft: "Salom! Bugun qulay vaqt bormi — qisqa demo qilib beray?",
    messages: [
      {
        id: "1",
        from: "customer",
        text: "Demo o'tkazib bera olasizmi?",
        time: "03:05 PM",
      },
    ],
  },
];

const NAV: {
  id: HeroView;
  label: string;
  icon: typeof InboxIcon;
}[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "pipeline", label: "Pipeline", icon: PipelineIcon },
  { id: "analytics", label: "Analytics", icon: AnalyticsIcon },
];

const PIPELINE = [
  { col: "New", tone: "bg-accent/15 text-accent", leads: ["M. N.", "Jamshid"] },
  { col: "Contacted", tone: "bg-[var(--default)] text-foreground/70", leads: ["Adapt Academy"] },
  { col: "Qualified", tone: "bg-success/15 text-success", leads: ["Haad Info", "Dilnoza"] },
];

const CHART = [
  { day: "M", value: 42, label: "4.2 min" },
  { day: "T", value: 58, label: "3.8 min" },
  { day: "W", value: 36, label: "5.1 min" },
  { day: "T", value: 64, label: "3.2 min" },
  { day: "F", value: 48, label: "4.0 min" },
  { day: "S", value: 72, label: "2.9 min" },
  { day: "S", value: 40, label: "4.5 min" },
];

function bubbleClass(from: Thread["messages"][number]["from"]) {
  if (from === "customer") {
    return "rounded-2xl rounded-bl-md bg-background text-foreground shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]";
  }
  if (from === "ai") {
    return "rounded-2xl rounded-br-md bg-accent/90 text-white shadow-sm";
  }
  return "rounded-2xl rounded-br-md bg-accent text-white shadow-sm";
}

export function LoginHeroVisual() {
  const [view, setView] = useState<HeroView>("inbox");
  const [threads, setThreads] = useState(THREADS);
  const [activeId, setActiveId] = useState("mn");
  const [sentFlash, setSentFlash] = useState<string | null>(null);
  const [compose, setCompose] = useState("");
  const [selectedBar, setSelectedBar] = useState(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  function selectThread(id: string) {
    setActiveId(id);
    setView("inbox");
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: undefined } : t)),
    );
  }

  function sendDraft() {
    if (!active.aiDraft) return;
    const draft = active.aiDraft;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== active.id) return t;
        return {
          ...t,
          aiDraft: undefined,
          preview: draft.slice(0, 42),
          messages: [
            ...t.messages,
            { id: `ai-${Date.now()}`, from: "ai", text: draft, time: "Now" },
          ],
        };
      }),
    );
    setSentFlash("AI reply sent");
    window.setTimeout(() => setSentFlash(null), 1800);
  }

  function sendCompose() {
    const text = compose.trim();
    if (!text) return;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== active.id) return t;
        return {
          ...t,
          preview: text.slice(0, 42),
          messages: [
            ...t.messages,
            { id: `op-${Date.now()}`, from: "operator", text, time: "Now" },
          ],
        };
      }),
    );
    setCompose("");
    setSentFlash("Message sent");
    window.setTimeout(() => setSentFlash(null), 1800);
  }

  return (
    <div className="mx-auto hidden w-full md:block md:max-w-none lg:h-full">
      <div className="relative flex h-full min-h-[480px] flex-col animate-[login-hero-in_700ms_ease-out] motion-reduce:animate-none lg:min-h-[540px] xl:min-h-[580px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-accent/10 blur-3xl xl:-inset-8"
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-background shadow-[0_20px_60px_0_color-mix(in_srgb,var(--foreground)_14%,transparent)] dark:border-white/[0.1]">
          {/* Title bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-[var(--surface-secondary)] px-4 py-2 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="ml-1 text-xs font-medium text-foreground/45">app.operatora.ai</span>
            </div>
            {sentFlash ? (
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                {sentFlash}
              </span>
            ) : (
              <span className="text-xs text-foreground/40">Live preview — click around</span>
            )}
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Nav rail */}
            <nav
              aria-label="Product sections"
              className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 border-r border-black/[0.06] bg-[var(--surface-secondary)] py-3 dark:border-white/[0.08]"
            >
              <div className="mb-1 flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
                O
              </div>
              {NAV.map((item) => {
                const selected = view === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={selected}
                    title={item.label}
                    onClick={() => setView(item.id)}
                    className={`group flex w-12 flex-col items-center gap-0.5 rounded-xl py-2 transition-all ${
                      selected
                        ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                        : "text-foreground/45 hover:bg-[var(--default)] hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div
              className={`min-w-0 flex-1 transition-opacity duration-200 ${
                mounted ? "opacity-100" : "opacity-0"
              }`}
            >
              {view === "inbox" ? (
                <div className="flex h-full min-h-0">
                  {/* Thread list */}
                  <div className="flex w-[34%] min-w-[9.5rem] shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Inbox</p>
                        <p className="text-[11px] text-foreground/45">3 conversations</p>
                      </div>
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Live
                      </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
                      {threads.map((thread) => {
                        const isActive = thread.id === active.id;
                        return (
                          <button
                            key={thread.id}
                            type="button"
                            onClick={() => selectThread(thread.id)}
                            className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-accent/[0.08] ring-1 ring-accent/25"
                                : "hover:bg-[var(--default)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="truncate text-sm font-medium text-foreground">
                                    {thread.name}
                                  </span>
                                  {thread.ai ? (
                                    <Sparkles className="size-3 shrink-0 text-accent" aria-hidden="true" />
                                  ) : null}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-foreground/45">{thread.preview}</p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-0.5">
                                <span className="text-[10px] text-foreground/35">{thread.time}</span>
                                {thread.unread ? (
                                  <span className="inline-flex min-w-4 animate-pulse items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                                    {thread.unread}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="flex min-w-0 flex-1 flex-col bg-[var(--surface-secondary)]/30">
                    <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{active.name}</p>
                        <p className="text-[11px] text-foreground/45">
                          {active.channel} · Lead assigned
                        </p>
                      </div>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                        Online
                      </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
                      {active.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`max-w-[88%] px-3 py-2 ${msg.from === "customer" ? "" : "ml-auto"} ${bubbleClass(msg.from)}`}
                        >
                          <p className="text-sm leading-snug">{msg.text}</p>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              msg.from === "customer" ? "text-foreground/35" : "text-white/65"
                            }`}
                          >
                            {msg.time}
                          </p>
                        </div>
                      ))}

                      {active.aiDraft ? (
                        <div className="mt-1 rounded-xl border border-accent/25 bg-background p-2.5 shadow-sm">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent/15">
                              <Sparkles className="size-3 text-accent" aria-hidden="true" />
                            </span>
                            <p className="text-xs font-medium text-foreground/65">AI suggested reply</p>
                          </div>
                          <p className="text-sm leading-snug text-foreground/75">{active.aiDraft}</p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={sendDraft}
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setThreads((prev) =>
                                  prev.map((t) =>
                                    t.id === active.id ? { ...t, aiDraft: undefined } : t,
                                  ),
                                )
                              }
                              className="rounded-lg bg-[var(--default)] px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:text-foreground"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Compose */}
                    <div className="shrink-0 border-t border-black/[0.06] p-2 dark:border-white/[0.08]">
                      <form
                        className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-background px-2 py-1.5 dark:border-white/[0.08]"
                        onSubmit={(e) => {
                          e.preventDefault();
                          sendCompose();
                        }}
                      >
                        <input
                          type="text"
                          value={compose}
                          onChange={(e) => setCompose(e.target.value)}
                          placeholder="Type a reply…"
                          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/35 outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!compose.trim()}
                          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : null}

              {view === "pipeline" ? (
                <div className="flex h-full min-h-0 flex-col p-3">
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pipeline</p>
                      <p className="text-[11px] text-foreground/45">Tap a lead to open in inbox</p>
                    </div>
                    <span className="text-xs tabular-nums text-foreground/40">6 leads</span>
                  </div>
                  <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
                    {PIPELINE.map((column) => (
                      <div
                        key={column.col}
                        className="flex min-h-0 flex-col rounded-xl border border-black/[0.06] bg-[var(--surface-secondary)]/50 p-1.5 dark:border-white/[0.08]"
                      >
                        <div className="mb-1.5 flex shrink-0 items-center justify-between px-1">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${column.tone}`}>
                            {column.col}
                          </span>
                          <span className="text-xs tabular-nums text-foreground/40">{column.leads.length}</span>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                          {column.leads.map((lead) => (
                            <button
                              key={lead}
                              type="button"
                              onClick={() => {
                                const match = threads.find((t) => t.name === lead);
                                if (match) selectThread(match.id);
                              }}
                              className="rounded-lg border border-black/[0.06] bg-background px-2.5 py-2 text-left text-sm font-medium text-foreground transition-all hover:-translate-y-px hover:border-accent/30 hover:bg-accent/[0.04] hover:shadow-sm dark:border-white/[0.08]"
                            >
                              {lead}
                              <p className="mt-0.5 text-[11px] font-normal text-foreground/40">Open chat →</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {view === "analytics" ? (
                <div className="flex h-full min-h-0 flex-col p-3">
                  <div className="mb-2 shrink-0">
                    <p className="text-sm font-semibold text-foreground">Today</p>
                    <p className="text-[11px] text-foreground/45">Workspace performance</p>
                  </div>
                  <div className="grid shrink-0 grid-cols-3 gap-2">
                    {[
                      { value: "2.4×", label: "Faster replies", delta: "+18%" },
                      { value: "84%", label: "Conversion lift", delta: "+6%" },
                      { value: "1.2k+", label: "Active operators", delta: "+12%" },
                    ].map((stat) => (
                      <button
                        key={stat.label}
                        type="button"
                        className="rounded-xl border border-black/[0.06] bg-[var(--surface-secondary)]/50 px-2.5 py-3 text-left transition-colors hover:border-accent/25 hover:bg-accent/[0.04] dark:border-white/[0.08]"
                      >
                        <p className="text-xl font-semibold tabular-nums text-foreground">{stat.value}</p>
                        <p className="mt-0.5 text-[11px] text-foreground/45">{stat.label}</p>
                        <p className="mt-1 text-[11px] font-medium text-success">{stat.delta}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-xl border border-black/[0.06] bg-background p-3 dark:border-white/[0.08]">
                    <div className="flex shrink-0 items-center justify-between">
                      <p className="text-xs font-medium text-foreground/45">Avg response time</p>
                      <p className="text-xs font-semibold tabular-nums text-accent">
                        {CHART[selectedBar]?.label}
                      </p>
                    </div>
                    <div className="mt-3 flex min-h-[8rem] flex-1 items-end gap-1.5">
                      {CHART.map((bar, i) => {
                        const selected = i === selectedBar;
                        return (
                          <button
                            key={`${bar.day}-${i}`}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setSelectedBar(i)}
                            className="group flex flex-1 flex-col items-center gap-1"
                          >
                            <div
                              className={`w-full rounded-md transition-all ${
                                selected ? "bg-accent" : "bg-accent/55 group-hover:bg-accent/80"
                              }`}
                              style={{ height: `${bar.value}%` }}
                            />
                            <span
                              className={`text-[10px] ${selected ? "font-semibold text-accent" : "text-foreground/30"}`}
                            >
                              {bar.day}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

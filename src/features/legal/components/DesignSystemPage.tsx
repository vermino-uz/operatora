"use client";

import { useState } from "react";
import { Button, Chip, Input, Label, ListBox, Select, Spinner, TextArea, TextField } from "@heroui/react";

import { OperatoraMark } from "@/features/auth/components/OperatoraMark";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";

/**
 * `/design-system` — public living style guide (no login required, mirrors
 * the old app's `/design-system` route — see `ARCHITECTURE.md` Part 1
 * "Pages/Routes"). The old app's `MobileDesignSystem.tsx` showcased its own
 * bespoke mobile component library (`@/components/operatora-mobile`,
 * pastel-token system) — that library doesn't exist in this codebase, so
 * rather than fabricate a port of components this project never built, this
 * page showcases *this* project's actual, real design system: the CSS
 * custom-property tokens in `app/globals.css` and the shared HeroUI-based
 * primitives already used across the app (`components/shared/*`, HeroUI
 * `Button`/`TextField`/`Select`/`Chip`). Static/demo content only — the
 * "error state" demo below constructs a real `ApiError` instance purely to
 * exercise `ErrorState`'s branching, it does not perform a network call.
 */

const COLOR_TOKENS: { name: string; cssVar: string }[] = [
  { name: "Background", cssVar: "--background" },
  { name: "Surface", cssVar: "--surface" },
  { name: "Surface secondary", cssVar: "--surface-secondary" },
  { name: "Surface tertiary", cssVar: "--surface-tertiary" },
  { name: "Accent", cssVar: "--accent" },
  { name: "Success", cssVar: "--success" },
  { name: "Warning", cssVar: "--warning" },
  { name: "Danger", cssVar: "--danger" },
  { name: "Border", cssVar: "--border" },
  { name: "Muted", cssVar: "--muted" },
];

const TYPE_SCALE = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"] as const;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-b border-foreground/[0.08] py-12 first:pt-0 last:border-0">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-foreground/60">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const SELECT_OPTIONS = [
  { id: "leads", label: "Leads" },
  { id: "messages", label: "Messages" },
  { id: "tasks", label: "Tasks" },
];

export function DesignSystemPage() {
  const [textValue, setTextValue] = useState("");
  const [selectValue, setSelectValue] = useState<string>("leads");
  const [showLoading, setShowLoading] = useState(true);

  const demoError = new ApiError({ statusCode: 500, message: "Simulated server error for this demo only." });

  return (
    <div className="min-h-svh bg-background px-6 py-16 text-foreground sm:px-12 lg:px-24">
      <header className="mb-4 flex items-center gap-3">
        <OperatoraMark className="size-8 text-accent" />
        <div>
          <p className="text-2xl font-bold tracking-tight">Design System</p>
          <p className="text-sm text-foreground/60">A living reference of Operatora&apos;s tokens and shared components.</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <Section title="Color tokens" description="Defined in `src/app/globals.css`, consumed as Tailwind utilities app-wide.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {COLOR_TOKENS.map((t) => (
              <div key={t.cssVar} className="flex flex-col items-start gap-2">
                <div
                  className="h-14 w-full rounded-xl border border-foreground/[0.08]"
                  style={{ background: `var(${t.cssVar})` }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="font-mono text-xs text-foreground/50">{t.cssVar}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography" description="Tailwind's default type scale, tuned via `--text-*` tokens in globals.css.">
          <div className="flex flex-col gap-2">
            {TYPE_SCALE.map((cls) => (
              <p key={cls} className={`${cls} text-foreground`}>
                {cls} — The quick brown fox jumps over the lazy dog.
              </p>
            ))}
          </div>
        </Section>

        <Section title="Buttons" description="HeroUI `Button` variants used across the app.">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="danger-soft">Danger soft</Button>
            <Button variant="primary" isDisabled>
              Disabled
            </Button>
          </div>
        </Section>

        <Section title="Chips" description="Status/label pills, HeroUI `Chip`.">
          <div className="flex flex-wrap items-center gap-3">
            <Chip size="sm" color="default" variant="soft">
              <Chip.Label>Default</Chip.Label>
            </Chip>
            <Chip size="sm" color="accent" variant="soft">
              <Chip.Label>Accent</Chip.Label>
            </Chip>
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label>Success</Chip.Label>
            </Chip>
            <Chip size="sm" color="warning" variant="soft">
              <Chip.Label>Warning</Chip.Label>
            </Chip>
            <Chip size="sm" color="danger" variant="soft">
              <Chip.Label>Danger</Chip.Label>
            </Chip>
          </div>
        </Section>

        <Section title="Form fields" description="HeroUI `TextField`/`Input`/`TextArea`/`Select`, the pattern used by every form in the app.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField isRequired>
              <Label>Text input</Label>
              <Input
                placeholder="Type something…"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </TextField>

            <Select
              aria-label="Select demo"
              value={selectValue}
              onChange={(key) => {
                if (typeof key === "string") setSelectValue(key);
              }}
            >
              <Label>Select</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={SELECT_OPTIONS}>
                  {(opt) => (
                    <ListBox.Item id={opt.id} textValue={opt.label}>
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField className="sm:col-span-2">
              <Label>Textarea</Label>
              <TextArea placeholder="A longer message…" rows={3} />
            </TextField>
          </div>
        </Section>

        <Section
          title="Async states"
          description="Every API-driven view in this app renders one of these — never a blank screen (see `components/shared/*`)."
        >
          <div className="flex flex-col gap-3">
            <Button size="sm" variant="secondary" onPress={() => setShowLoading((v) => !v)}>
              Toggle loading demo
            </Button>
            <div className="rounded-xl border border-foreground/[0.08] p-4">
              {showLoading ? <LoadingState label="Loading…" /> : <EmptyState title="No results" description="Nothing to show yet." />}
            </div>
            <div className="rounded-xl border border-foreground/[0.08] p-4">
              <ErrorState error={demoError} onRetry={() => {}} />
            </div>
            <div className="flex items-center gap-3">
              <Spinner size="sm" aria-label="Small spinner" />
              <Spinner size="md" aria-label="Medium spinner" />
              <Spinner size="lg" aria-label="Large spinner" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

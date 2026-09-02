"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { ArrowLeft, ArrowRight, Plus, Sparkles, SquareXmark } from "@gravity-ui/icons";

import type {
  AgentTone,
  AgenticChannel,
  AgenticHandoffRules,
  AgenticTargeting,
  AgentProduct,
  WorkspaceAgentProfile,
} from "@/services/api/agentic";
import { useAgentProfile, useAgenticSettings, useSaveAgentProfile } from "@/features/messages/hooks/useAgentic";
import { AgenticKnowledgeManager } from "@/features/messages/components/agentic/AgenticKnowledgeManager";
import type { AgenticChatLite } from "@/features/messages/components/agentic/types";
import {
  DAY_LABELS,
  DAY_ORDER,
  DEFAULT_HANDOFF,
  HANDOFF_LABELS,
  INPUT_CLS,
  LANG_LABELS,
  LANG_OPTIONS,
  PAYMENT_LABELS,
  PAYMENT_OPTIONS,
  TONE_DESCRIPTIONS,
  TONE_LABELS,
  TONE_OPTIONS,
} from "@/features/messages/components/agentic/constants";
import { ChipButton, FieldLabel, StatusBanner } from "@/features/messages/components/agentic/agenticUi";

const TOTAL_STEPS = 5;

export interface AgenticSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  channel?: AgenticChannel;
  chats?: AgenticChatLite[];
  editMode?: boolean;
}

type FormState = {
  business_name: string;
  tagline: string;
  languages: string[];
  city: string;
  address: string;
  working_days: number[];
  hours_start: string;
  hours_end: string;
  timezone: string;
  tone: AgentTone | null;
  human_contact: string;
  never_do: string[];
  products: AgentProduct[];
  payment_methods: string[];
  extra_instructions: string;
  targeting: AgenticTargeting;
  handoff: AgenticHandoffRules;
  enable_agent: boolean;
};

function fromProfile(
  p: WorkspaceAgentProfile | undefined,
  settingsTargeting?: AgenticTargeting,
  settingsHandoff?: AgenticHandoffRules,
): FormState {
  return {
    business_name: p?.business_name || "",
    tagline: p?.tagline || "",
    languages: p?.languages?.length ? [...p.languages] : ["uz", "ru"],
    city: p?.city || "",
    address: p?.address || "",
    working_days: p?.working_days?.length ? [...p.working_days] : [1, 2, 3, 4, 5],
    hours_start: p?.hours_start || "09:00",
    hours_end: p?.hours_end || "18:00",
    timezone: p?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent",
    tone: p?.tone || "friendly",
    human_contact: p?.human_contact || "",
    never_do: p?.never_do?.length ? [...p.never_do] : [],
    products: p?.products?.length
      ? p.products.map((x) => ({ name: x.name, price: x.price ?? "" }))
      : [{ name: "", price: "" }],
    payment_methods: p?.payment_methods?.length ? [...p.payment_methods] : ["cash", "card"],
    extra_instructions: p?.extra_instructions || "",
    targeting: settingsTargeting || "new_only",
    handoff: settingsHandoff || DEFAULT_HANDOFF,
    enable_agent: true,
  };
}

export function AgenticSetupWizard({
  isOpen,
  onClose,
  onComplete,
  channel = "telegram",
  editMode = false,
}: AgenticSetupWizardProps) {
  const { data: profile } = useAgentProfile(isOpen);
  const { data: settings } = useAgenticSettings(isOpen, channel);
  const save = useSaveAgentProfile();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => fromProfile(undefined));
  const [neverDraft, setNeverDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setHydrated(false);
      setNeverDraft("");
      setFeedback(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || hydrated || !profile) return;
    setForm(fromProfile(profile, settings?.targeting, settings?.handoff));
    setHydrated(true);
  }, [isOpen, profile, settings, hydrated]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const stepValid = useMemo(() => {
    if (step === 0) return form.business_name.trim().length > 0 && form.tagline.trim().length > 0;
    if (step === 1) return form.working_days.length > 0 && !!form.hours_start && !!form.hours_end;
    return true;
  }, [step, form]);

  function toggleInArray(arr: string[], value: string) {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  }

  function toggleDay(day: number) {
    const next = form.working_days.includes(day)
      ? form.working_days.filter((d) => d !== day)
      : [...form.working_days, day].sort((a, b) => a - b);
    patch("working_days", next);
  }

  async function handleFinish(enable: boolean) {
    try {
      await save.mutateAsync({
        business_name: form.business_name.trim(),
        tagline: form.tagline.trim(),
        languages: form.languages,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        working_days: form.working_days,
        hours_start: form.hours_start,
        hours_end: form.hours_end,
        timezone: form.timezone.trim() || null,
        tone: form.tone,
        human_contact: form.human_contact.trim() || null,
        never_do: form.never_do.map((s) => s.trim()).filter(Boolean),
        products: form.products
          .map((p) => ({ name: p.name.trim(), price: p.price?.trim() || null }))
          .filter((p) => p.name),
        payment_methods: form.payment_methods,
        extra_instructions: form.extra_instructions.trim() || null,
        mark_setup_complete: true,
        channel,
        channel_settings: editMode
          ? undefined
          : {
              enabled: enable,
              targeting: form.targeting,
              handoff: form.handoff,
            },
      });
      setFeedback({
        kind: "success",
        message: enable && !editMode ? "Agent Mode enabled" : "Business profile saved",
      });
      onComplete();
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not save profile",
      });
    }
  }

  const titles = ["About the business", "Where & when", "How to talk", "What you sell", "Go live"];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" className="max-w-[560px]">
          <Modal.Dialog className="max-h-[85vh] overflow-hidden p-0">
            <Modal.Header className="border-b border-black/10 px-6 pb-4 pt-5 dark:border-white/10">
              <Modal.Heading className="flex items-center gap-2">
                <Sparkles className="size-[18px] text-[#7C3AED]" />
                {editMode ? "Edit business profile" : "Set up Agent Mode"}
              </Modal.Heading>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-foreground/60">
                  Step {step + 1} of {TOTAL_STEPS} · {titles[step]}
                </p>
                <div className="flex items-center gap-1.5" aria-hidden>
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        i <= step ? "bg-[#7C3AED]" : "bg-black/20 dark:bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
              {feedback ? <StatusBanner kind={feedback.kind} message={feedback.message} /> : null}

              {step === 0 ? (
                <>
                  <FieldLabel label="Business name" required>
                    <input
                      className={INPUT_CLS}
                      value={form.business_name}
                      onChange={(e) => patch("business_name", e.target.value)}
                      placeholder="e.g. Operatora"
                    />
                  </FieldLabel>
                  <FieldLabel label="What do you do?" required>
                    <textarea
                      className={`${INPUT_CLS} min-h-[72px] resize-y`}
                      value={form.tagline}
                      onChange={(e) => patch("tagline", e.target.value)}
                      placeholder="1–2 sentences about what you offer"
                      rows={3}
                    />
                  </FieldLabel>
                  <FieldLabel label="Reply in">
                    <div className="flex flex-wrap gap-2">
                      {LANG_OPTIONS.map((lang) => (
                        <ChipButton
                          key={lang}
                          selected={form.languages.includes(lang)}
                          onClick={() => patch("languages", toggleInArray(form.languages, lang))}
                        >
                          {LANG_LABELS[lang]}
                        </ChipButton>
                      ))}
                    </div>
                  </FieldLabel>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <FieldLabel label="City / area">
                    <input className={INPUT_CLS} value={form.city} onChange={(e) => patch("city", e.target.value)} placeholder="e.g. Tashkent, Chilonzor" />
                  </FieldLabel>
                  <FieldLabel label="Address">
                    <input className={INPUT_CLS} value={form.address} onChange={(e) => patch("address", e.target.value)} placeholder="Street, landmark (optional)" />
                  </FieldLabel>
                  <FieldLabel label="Working days" required>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_ORDER.map((d) => (
                        <ChipButton key={d} selected={form.working_days.includes(d)} onClick={() => toggleDay(d)}>
                          {DAY_LABELS[d]}
                        </ChipButton>
                      ))}
                    </div>
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldLabel label="From" required>
                      <input type="time" className={INPUT_CLS} value={form.hours_start} onChange={(e) => patch("hours_start", e.target.value)} />
                    </FieldLabel>
                    <FieldLabel label="To" required>
                      <input type="time" className={INPUT_CLS} value={form.hours_end} onChange={(e) => patch("hours_end", e.target.value)} />
                    </FieldLabel>
                  </div>
                  <FieldLabel label="Timezone">
                    <input className={INPUT_CLS} value={form.timezone} onChange={(e) => patch("timezone", e.target.value)} placeholder="Asia/Tashkent" />
                  </FieldLabel>
                  <p className="text-xs leading-[17px] text-foreground/60">
                    Outside these hours the agent can hand chats to a human (you can change this later).
                  </p>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <FieldLabel label="Tone">
                    <div className="grid grid-cols-2 gap-2">
                      {TONE_OPTIONS.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => patch("tone", tone)}
                          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            form.tone === tone ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-black/10 hover:bg-black/5 dark:border-white/10"
                          }`}
                        >
                          <div className="text-[13px] font-semibold text-foreground">{TONE_LABELS[tone]}</div>
                          <div className="mt-0.5 text-[11px] text-foreground/60">{TONE_DESCRIPTIONS[tone]}</div>
                        </button>
                      ))}
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Contact for humans">
                    <input className={INPUT_CLS} value={form.human_contact} onChange={(e) => patch("human_contact", e.target.value)} placeholder="+998… or @username" />
                  </FieldLabel>
                  <FieldLabel label="Never do / say">
                    <div className="space-y-2">
                      {form.never_do.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-[13px] dark:border-white/10 dark:bg-white/5">
                          <span className="flex-1 text-foreground">{rule}</span>
                          <button type="button" className="text-foreground/40" onClick={() => patch("never_do", form.never_do.filter((_, j) => j !== i))}>
                            <SquareXmark className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          className={`${INPUT_CLS} flex-1`}
                          value={neverDraft}
                          onChange={(e) => setNeverDraft(e.target.value)}
                          placeholder="e.g. Don't invent discounts"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = neverDraft.trim();
                              if (!v) return;
                              patch("never_do", [...form.never_do, v]);
                              setNeverDraft("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-3 text-xs font-medium text-foreground/60 hover:bg-black/5 dark:border-white/10"
                          onClick={() => {
                            const v = neverDraft.trim();
                            if (!v) return;
                            patch("never_do", [...form.never_do, v]);
                            setNeverDraft("");
                          }}
                        >
                          <Plus className="size-3.5" />
                          Add
                        </button>
                      </div>
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Extra instructions">
                    <textarea
                      className={`${INPUT_CLS} min-h-[64px] resize-y`}
                      value={form.extra_instructions}
                      onChange={(e) => patch("extra_instructions", e.target.value)}
                      placeholder="Anything else the agent should know…"
                      rows={2}
                    />
                  </FieldLabel>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <FieldLabel label="Top products / services">
                    <div className="space-y-2">
                      {form.products.map((p, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            className={`${INPUT_CLS} flex-[2]`}
                            value={p.name}
                            onChange={(e) => {
                              const next = [...form.products];
                              next[i] = { ...next[i], name: e.target.value };
                              patch("products", next);
                            }}
                            placeholder="Name"
                          />
                          <input
                            className={`${INPUT_CLS} flex-1`}
                            value={p.price || ""}
                            onChange={(e) => {
                              const next = [...form.products];
                              next[i] = { ...next[i], price: e.target.value };
                              patch("products", next);
                            }}
                            placeholder="Price (optional)"
                          />
                          {form.products.length > 1 ? (
                            <button type="button" className="px-1 text-foreground/40" onClick={() => patch("products", form.products.filter((_, j) => j !== i))}>
                              <SquareXmark className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {form.products.length < 3 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
                          onClick={() => patch("products", [...form.products, { name: "", price: "" }])}
                        >
                          <Plus className="size-3.5" />
                          Add product
                        </button>
                      ) : null}
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Pay with">
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_OPTIONS.map((pm) => (
                        <ChipButton
                          key={pm}
                          selected={form.payment_methods.includes(pm)}
                          onClick={() => patch("payment_methods", toggleInArray(form.payment_methods, pm))}
                        >
                          {PAYMENT_LABELS[pm]}
                        </ChipButton>
                      ))}
                    </div>
                  </FieldLabel>
                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-foreground">Knowledge base</div>
                    <p className="mb-3 text-xs text-foreground/60">
                      Optional — paste, upload, or add a URL. You can skip and add later.
                    </p>
                    <AgenticKnowledgeManager active={isOpen} channel={channel} />
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  {!editMode ? (
                    <>
                      <FieldLabel label="Who should the agent answer?">
                        <div className="space-y-2">
                          {(
                            [
                              ["new_only", "Only new conversations", "Chats that have no previous operator reply yet."],
                              ["everyone", "Everyone who messages", "Every incoming customer chat on this channel."],
                            ] as const
                          ).map(([value, title, desc]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => patch("targeting", value)}
                              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                form.targeting === value ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-black/10 hover:bg-black/5 dark:border-white/10"
                              }`}
                            >
                              <div className="text-[13px] font-semibold text-foreground">{title}</div>
                              <div className="mt-0.5 text-xs text-foreground/60">{desc}</div>
                            </button>
                          ))}
                        </div>
                      </FieldLabel>
                      <FieldLabel label="Hand off to a human when…">
                        <div className="space-y-2">
                          {(Object.keys(HANDOFF_LABELS) as (keyof AgenticHandoffRules)[]).map((key) => (
                            <label key={key} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-foreground">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={!!form.handoff[key]}
                                onChange={(e) => patch("handoff", { ...form.handoff, [key]: e.target.checked })}
                              />
                              <span>{HANDOFF_LABELS[key]}</span>
                            </label>
                          ))}
                        </div>
                      </FieldLabel>
                    </>
                  ) : (
                    <p className="text-[13px] text-foreground/60">
                      Save to update the shared business profile used by Telegram and Instagram agents.
                    </p>
                  )}
                </>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-3.5 dark:border-white/10">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium ${
                  step === 0 ? "cursor-not-allowed text-foreground/30" : "text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <Button isDisabled={!stepValid} onPress={() => setStep((s) => s + 1)}>
                  Continue
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : editMode ? (
                <Button
                  isDisabled={save.isPending || !form.business_name.trim() || !form.tagline.trim()}
                  onPress={() => void handleFinish(false)}
                >
                  {save.isPending ? "Saving…" : "Save profile"}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" isDisabled={save.isPending} onPress={() => void handleFinish(false)}>
                    Save without enabling
                  </Button>
                  <Button
                    isDisabled={save.isPending || !form.business_name.trim() || !form.tagline.trim()}
                    onPress={() => void handleFinish(true)}
                  >
                    {save.isPending ? "Saving…" : "Enable Agent Mode"}
                  </Button>
                </div>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

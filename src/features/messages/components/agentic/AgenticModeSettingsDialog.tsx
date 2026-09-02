"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Switch } from "@heroui/react";
import {
  ArrowRight,
  Ban,
  CircleExclamation,
  Clock,
  Copy,
  Database,
  FaceRobot,
  Lock,
  Moon,
  Persons as Users2,
  Sparkles,
  LayoutHeaderCells,
} from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { useBillingFeaturesQuery } from "@/features/team/hooks/useBilling";
import type {
  AgenticHandoffRules,
  AgenticResponseDelayMode,
  AgenticTargeting,
  AgenticWorkingHours,
  AgenticChannel,
} from "@/services/api/agentic";
import {
  useAgenticSettings,
  useAgenticStatus,
  useAgentProfile,
  useSaveAgenticSettings,
} from "@/features/messages/hooks/useAgentic";
import { AgenticSetupWizard } from "@/features/messages/components/agentic/AgenticSetupWizard";
import { AgenticTargetingDialog } from "@/features/messages/components/agentic/AgenticTargetingDialog";
import { AgenticKnowledgeManager } from "@/features/messages/components/agentic/AgenticKnowledgeManager";
import { AgenticBlacklistManager } from "@/features/messages/components/agentic/AgenticBlacklistManager";
import { AgenticAwayRepliesPanel } from "@/features/messages/components/agentic/AgenticAwayRepliesPanel";
import { AgenticDepartmentsSection } from "@/features/messages/components/agentic/AgenticDepartmentsSection";
import { AgenticBusinessProfilePane } from "@/features/messages/components/agentic/AgenticBusinessProfilePane";
import type { AgenticChatLite } from "@/features/messages/components/agentic/types";
import {
  DEFAULT_HANDOFF,
  DEFAULT_VOICE_PERCENT,
  HANDOFF_LABELS,
  RESPONSE_DELAY_OPTIONS,
  VOICE_PERCENT_OPTIONS,
} from "@/features/messages/components/agentic/constants";
import { CheckRow, PaneBlock, StatusBanner, TargetRow } from "@/features/messages/components/agentic/agenticUi";

export type { AgenticChatLite };

export interface AgenticModeSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  botLabel?: string;
  /** Linked user-account inbox (Pyrogram / TDLib) — hides Business-bot-only warnings. */
  accountMode?: boolean;
  chats?: AgenticChatLite[];
  channel?: AgenticChannel;
  isOwner?: boolean;
  onOpenChat?: (chatId: string) => void;
}

type SettingsSection = "profile" | "behaviour" | "data" | "departments" | "blacklist" | "away";

export function AgenticModeSettingsDialog({
  isOpen,
  onClose,
  botLabel,
  accountMode = false,
  chats = [],
  channel = "telegram",
  isOwner = false,
  onOpenChat,
}: AgenticModeSettingsDialogProps) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const billingQuery = useBillingFeaturesQuery(workspaceId);
  // planSlug is available on billing; no dedicated plan-tier helper in the new UI yet.
  const canUseHigherVoiceShare = billingQuery.data?.planSlug === "corporate";

  const isInstagram = channel === "instagram";
  const otherChannel: AgenticChannel = isInstagram ? "telegram" : "instagram";
  const resolvedBotLabel = botLabel ?? (accountMode ? "linked account" : "your business bot");

  const { data: settings } = useAgenticSettings(isOpen, channel);
  const { data: otherSettings } = useAgenticSettings(isOpen, otherChannel);
  const { data: status } = useAgenticStatus(isOpen && !isInstagram && !accountMode, channel);
  const { data: profile, isLoading: profileLoading } = useAgentProfile(isOpen);
  const save = useSaveAgenticSettings(channel);
  const pushToOther = useSaveAgenticSettings(otherChannel);

  const replyBotHandle = status?.botUsername ? `@${status.botUsername}` : "your business bot";

  const [section, setSection] = useState<SettingsSection>("profile");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const setupIncomplete = !profileLoading && !!profile && !profile.setup_completed_at;
  const showWizard = isOpen && setupIncomplete;

  const [enabled, setEnabled] = useState(false);
  const [targeting, setTargeting] = useState<AgenticTargeting>("new_only");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [handoff, setHandoff] = useState<AgenticHandoffRules>(DEFAULT_HANDOFF);
  const [targetingOpen, setTargetingOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [voicePercent, setVoicePercent] = useState<number>(DEFAULT_VOICE_PERCENT);
  const [autoSendSeconds, setAutoSendSeconds] = useState(0);
  const [responseDelayMode, setResponseDelayMode] = useState<AgenticResponseDelayMode>("instant");
  const [workingHours, setWorkingHours] = useState<AgenticWorkingHours>({ start: "09:00", end: "18:00" });

  const sessionRef = useRef({ id: 0, userTouched: false });
  const hydratedSessionId = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      sessionRef.current = { id: 0, userTouched: false };
      hydratedSessionId.current = 0;
      setSection(isOwner ? "profile" : "blacklist");
      setFeedback(null);
      return;
    }
    sessionRef.current.id += 1;
  }, [isOpen, isOwner]);

  function markTouched() {
    sessionRef.current.userTouched = true;
  }

  useEffect(() => {
    if (!isOpen || !settings) return;
    if (sessionRef.current.userTouched) return;
    if (hydratedSessionId.current >= sessionRef.current.id) return;
    hydratedSessionId.current = sessionRef.current.id;
    setEnabled(!!settings.enabled);
    setTargeting(settings.targeting);
    setSelectedIds(Array.isArray(settings.selected_chat_ids) ? settings.selected_chat_ids : []);
    setHandoff(settings.handoff);
    setInstructions(settings.instructions || "");
    const configured = !!settings.id;
    const storedVoice = Number(settings.voice_percent);
    const inRange = (VOICE_PERCENT_OPTIONS as readonly number[]).includes(storedVoice);
    setVoicePercent(configured && inRange ? storedVoice : DEFAULT_VOICE_PERCENT);
    setAutoSendSeconds(settings.auto_send_seconds ?? 0);
    setResponseDelayMode(settings.response_delay_mode ?? "instant");
    setWorkingHours(settings.working_hours ?? { start: "09:00", end: "18:00" });
  }, [isOpen, settings]);

  const handoffFields = useMemo(
    () => (Object.keys(HANDOFF_LABELS) as (keyof AgenticHandoffRules)[]).map((key) => ({ key, label: HANDOFF_LABELS[key] })),
    [],
  );

  async function pushToOtherChannel() {
    const channelLabel = otherChannel === "telegram" ? "Telegram" : "Instagram";
    if (
      !window.confirm(
        `This will overwrite ${channelLabel}'s behaviour settings (reply mode, delay, voice, handoff rules) with what's configured here. Continue?`,
      )
    ) {
      return;
    }
    try {
      await pushToOther.mutateAsync({
        instructions,
        voice_percent: voicePercent,
        handoff,
        auto_send_seconds: autoSendSeconds,
        response_delay_mode: responseDelayMode,
        ...(targeting !== "selected" ? { targeting } : {}),
      });
      setFeedback({
        kind: "success",
        message:
          targeting === "selected"
            ? `Pushed settings to ${channelLabel}. Which chats to target wasn't pushed — chat selections don't carry over between channels.`
            : `Pushed settings to ${channelLabel}`,
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not save",
      });
    }
  }

  async function handleSave() {
    try {
      await save.mutateAsync({
        enabled,
        instructions,
        response_mode: "auto",
        voice_percent: voicePercent,
        targeting,
        selected_chat_ids: selectedIds,
        handoff,
        auto_send_seconds: autoSendSeconds,
        response_delay_mode: responseDelayMode,
        working_hours: workingHours,
      });
      setFeedback({ kind: "success", message: "Agentic Mode saved" });
      onClose();
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not save",
      });
    }
  }

  const navItems: {
    id: SettingsSection;
    label: string;
    hint: string;
    icon: React.ReactNode;
  }[] = [
    ...(isOwner
      ? [
          { id: "profile" as SettingsSection, label: "Business Profile", hint: "Name, hours, location, tone", icon: <LayoutHeaderCells className="size-4" /> },
          { id: "behaviour" as SettingsSection, label: "Agent Behaviour", hint: "Enable, targeting, instructions", icon: <FaceRobot className="size-4" /> },
          { id: "data" as SettingsSection, label: "Data feed", hint: "Products & catalog for answers", icon: <Database className="size-4" /> },
          { id: "departments" as SettingsSection, label: "Departments", hint: "Who escalations get routed to", icon: <Users2 className="size-4" /> },
        ]
      : []),
    { id: "blacklist", label: "Blacklist", hint: "Customers the agent ignores", icon: <Ban className="size-4" /> },
    { id: "away", label: "While you were away", hint: "Chats the agent replied to outside working hours", icon: <Moon className="size-4" /> },
  ];

  if (showWizard) {
    return (
      <AgenticSetupWizard
        isOpen={isOpen}
        onClose={onClose}
        onComplete={() => {
          /* profile query refreshes → settings modal shows */
        }}
        channel={channel}
        chats={chats}
      />
    );
  }

  if (isOpen && profileLoading) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open && !save.isPending) onClose();
        }}
      >
        <Modal.Backdrop>
          <Modal.Container scroll="inside" className="w-[calc(100vw-2rem)] max-w-[1040px]">
            <Modal.Dialog className="!max-w-[1040px] flex h-[min(720px,85vh)] w-full max-h-[85vh] flex-col overflow-hidden p-0">
              <Modal.Header className="shrink-0 border-b border-black/10 px-6 pb-4 pt-5 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Modal.Heading className="flex items-center gap-2 text-lg font-semibold">
                      <Sparkles className="size-[18px] shrink-0 text-[#7C3AED]" />
                      Agentic Mode
                    </Modal.Heading>
                    <p className="mt-1 text-sm text-foreground/60">
                      {isInstagram
                        ? `Instagram DM · ${resolvedBotLabel} — let the AI agent read and reply to customer DMs`
                        : accountMode
                          ? `Linked account · ${resolvedBotLabel} — let the AI agent read and reply through your Telegram account`
                          : `Telegram · ${resolvedBotLabel} — let the AI agent read and reply to customer chats`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 pt-0.5">
                    {isOwner && otherSettings?.id ? (
                      <button
                        type="button"
                        onClick={() => void pushToOtherChannel()}
                        disabled={pushToOther.isPending}
                        title={`Sync these behaviour settings to ${otherChannel === "telegram" ? "Telegram" : "Instagram"} instead of configuring it separately.`}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-xs font-semibold text-foreground/70 hover:bg-black/5 disabled:opacity-50 dark:border-white/10"
                      >
                        <Copy className="size-3.5" />
                        Sync to {otherChannel === "telegram" ? "Telegram" : "Instagram"}
                      </button>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-black/5 text-foreground/40 dark:bg-white/10"
                      }`}
                    >
                      {enabled ? "Active" : "Off"}
                    </span>
                    {isOwner ? (
                      <Switch
                        isSelected={enabled}
                        onChange={(v) => {
                          markTouched();
                          setEnabled(v);
                          setSection("behaviour");
                        }}
                        aria-label="Enable Agentic Mode"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    ) : null}
                  </div>
                </div>
              </Modal.Header>

              {feedback ? (
                <div className="shrink-0 px-6 pt-3">
                  <StatusBanner kind={feedback.kind} message={feedback.message} />
                </div>
              ) : null}

              {!isInstagram && !accountMode && status?.replyBlocked ? (
                <div className="mx-6 mt-4 flex shrink-0 items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <CircleExclamation className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0 text-xs leading-[17px] text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">The agent cannot send replies right now.</span>{" "}
                    In Telegram Business, {replyBotHandle} does not have «Reply to messages» permission. Open Telegram →
                    Settings → Business → Chatbots → {replyBotHandle} → enable «Reply to messages». Settings take effect
                    immediately.
                  </div>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <nav className="w-[220px] shrink-0 space-y-1 overflow-y-auto border-r border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                  {navItems.map((item) => {
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border border-black/10 bg-[var(--default)] shadow-sm dark:border-white/10"
                            : "border border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={active ? "text-[#7C3AED]" : "text-foreground/40"}>{item.icon}</span>
                          <span className={`text-[13px] font-semibold ${active ? "text-foreground" : "text-foreground/70"}`}>
                            {item.label}
                          </span>
                        </div>
                        <p className="mt-1 pl-6 text-[11px] leading-[15px] text-foreground/40">{item.hint}</p>
                      </button>
                    );
                  })}
                </nav>

                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-5">
                  {isOwner && section === "profile" ? <AgenticBusinessProfilePane profile={profile} /> : null}

                  {isOwner && section === "behaviour" ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">Agent Behaviour</h3>
                        <p className="mt-0.5 text-xs text-foreground/60">
                          Control when the agent replies, voice share, handoff rules, and standing instructions.
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-[var(--default)] dark:border-white/10">
                        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground">Enable Agentic Mode</div>
                            <p className="mt-0.5 text-xs text-foreground/60">
                              When on, the agent monitors incoming messages and responds per the rules below.
                            </p>
                          </div>
                          <Switch
                            isSelected={enabled}
                            onChange={(v) => {
                              markTouched();
                              setEnabled(v);
                            }}
                            aria-label="Enable Agentic Mode"
                          >
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch>
                        </div>

                        <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[13px] font-medium text-foreground">Voice reply share</span>
                            <div className="flex flex-wrap items-center gap-1" role="radiogroup">
                              {VOICE_PERCENT_OPTIONS.map((p) => {
                                const locked = p > 30 && !canUseHigherVoiceShare;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={voicePercent === p}
                                    onClick={() => {
                                      if (locked) {
                                        setFeedback({
                                          kind: "error",
                                          message:
                                            "Upgrade to the Corporate plan to enable a voice reply share above 30%.",
                                        });
                                        return;
                                      }
                                      markTouched();
                                      setVoicePercent(p);
                                    }}
                                    className={`inline-flex h-7 min-w-[42px] items-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors ${
                                      locked
                                        ? "cursor-not-allowed bg-black/5 text-foreground/30 dark:bg-white/10"
                                        : voicePercent === p
                                          ? "bg-[#7C3AED] text-white"
                                          : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
                                    }`}
                                  >
                                    {locked ? <Lock className="size-2.5" /> : null}
                                    {p}%
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <p className="mt-1.5 pl-0 text-xs leading-[17px] text-foreground/60">
                            At 0% every reply is text. Otherwise greetings and short conversational replies go out as
                            voice, at roughly the chosen share of all messages.
                          </p>
                          {!canUseHigherVoiceShare ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] leading-[16px] text-foreground/40">
                              <Lock className="size-2.5 shrink-0" />
                              A share above 30% is available on the Corporate plan only.
                            </p>
                          ) : null}
                        </div>

                        <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Clock className="size-3.5 shrink-0 text-[#7C3AED]" />
                              <span className="text-[13px] font-medium text-foreground">Response delay</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1" role="radiogroup">
                              {RESPONSE_DELAY_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={responseDelayMode === opt.value}
                                  onClick={() => {
                                    markTouched();
                                    setResponseDelayMode(opt.value);
                                  }}
                                  className={`h-7 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                                    responseDelayMode === opt.value
                                      ? "bg-[#7C3AED] text-white"
                                      : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="mt-1.5 pl-6 text-xs leading-[17px] text-foreground/60">
                            The agent waits the chosen delay before replying instead of answering instantly — reads more
                            like a real person.
                          </p>
                        </div>
                      </div>

                      <PaneBlock title="Which chats should the agent handle?">
                        <div className="space-y-2.5">
                          <TargetRow
                            title="Only new conversations"
                            desc="Chats that have no previous operator reply yet."
                            selected={targeting === "new_only"}
                            onClick={() => {
                              markTouched();
                              setTargeting("new_only");
                            }}
                          />
                          <TargetRow
                            title="Everyone who messages"
                            desc="Every incoming customer chat on this channel."
                            selected={targeting === "everyone"}
                            onClick={() => {
                              markTouched();
                              setTargeting("everyone");
                            }}
                          />
                          <TargetRow
                            title="Selected chats only"
                            desc="Pick specific conversations to hand to the agent."
                            selected={targeting === "selected"}
                            onClick={() => {
                              markTouched();
                              setTargeting("selected");
                            }}
                          />
                          {targeting === "selected" ? (
                            <button
                              type="button"
                              onClick={() => setTargetingOpen(true)}
                              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED] hover:underline"
                            >
                              Choose chats
                              <ArrowRight className="size-3.5" />
                              {selectedIds.length > 0 ? (
                                <span className="font-normal text-foreground/60">({selectedIds.length})</span>
                              ) : null}
                            </button>
                          ) : null}
                        </div>
                      </PaneBlock>

                      <PaneBlock
                        title="Instructions"
                        hint="Extra rules for this channel — tone overrides and reply style. Prefer Business Profile facts when they conflict."
                      >
                        <textarea
                          value={instructions}
                          onChange={(e) => {
                            setInstructions(e.target.value);
                            markTouched();
                          }}
                          rows={8}
                          placeholder="e.g. We sell Operatora — a CRM for sales teams. Be friendly and concise. Pro plan is $49/mo…"
                          className="min-h-[180px] w-full resize-y rounded-lg bg-black/5 px-3 py-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
                        />
                      </PaneBlock>

                      <PaneBlock title="Hand off to a human when…">
                        <div className="space-y-2.5">
                          {handoffFields.map((f) => (
                            <CheckRow
                              key={f.key}
                              label={f.label}
                              checked={handoff[f.key]}
                              onChange={(v) => {
                                markTouched();
                                setHandoff((h) => ({ ...h, [f.key]: v }));
                              }}
                            />
                          ))}
                        </div>
                        {handoff.outside_working_hours ? (
                          <div className="mt-3 rounded-lg bg-black/5 px-3.5 py-3 dark:bg-white/5">
                            <div className="mb-0.5 text-[13px] font-semibold text-foreground">Working hours</div>
                            <p className="mb-2.5 text-xs text-foreground/60">
                              Outside these hours, chats hand off to a human if that rule is enabled below.
                            </p>
                            <div className="flex items-center gap-3">
                              <label className="flex-1">
                                <span className="mb-1 block text-[11px] text-foreground/40">From</span>
                                <input
                                  type="time"
                                  value={workingHours.start}
                                  onChange={(e) => {
                                    markTouched();
                                    setWorkingHours((h) => ({ ...h, start: e.target.value }));
                                  }}
                                  className="h-9 w-full rounded-lg bg-[var(--default)] px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                                />
                              </label>
                              <label className="flex-1">
                                <span className="mb-1 block text-[11px] text-foreground/40">To</span>
                                <input
                                  type="time"
                                  value={workingHours.end}
                                  onChange={(e) => {
                                    markTouched();
                                    setWorkingHours((h) => ({ ...h, end: e.target.value }));
                                  }}
                                  className="h-9 w-full rounded-lg bg-[var(--default)] px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </PaneBlock>
                    </div>
                  ) : null}

                  {isOwner && section === "data" ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">Data feed</h3>
                        <p className="mt-0.5 text-xs text-foreground/60">
                          Upload a product catalog (Excel or CSV) or enter items manually. The agent answers from this
                          data.
                        </p>
                      </div>
                      <AgenticKnowledgeManager active={isOpen && section === "data"} channel={channel} variant="dataFeed" />
                    </div>
                  ) : null}

                  {isOwner && section === "departments" ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">Departments</h3>
                        <p className="mt-0.5 text-xs text-foreground/60">Who escalations get routed to</p>
                      </div>
                      <AgenticDepartmentsSection />
                    </div>
                  ) : null}

                  {section === "blacklist" ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">Blacklist</h3>
                        <p className="mt-0.5 text-xs text-foreground/60">
                          These customers are skipped by the AI agent in every targeting mode, even &quot;everyone&quot;.
                        </p>
                      </div>
                      <AgenticBlacklistManager active={isOpen && section === "blacklist"} channel={channel} />
                    </div>
                  ) : null}

                  {section === "away" ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">While you were away</h3>
                        <p className="mt-0.5 text-xs text-foreground/60">
                          Chats the AI agent auto-replied to outside working hours (while you were away) in the last 14
                          days.
                        </p>
                      </div>
                      <AgenticAwayRepliesPanel
                        active={isOpen && section === "away"}
                        channel={channel}
                        onOpenChat={onOpenChat}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <Modal.Footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/10 px-6 py-4 dark:border-white/10">
                <span className="text-xs text-foreground/40">Applies to new incoming messages immediately.</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onPress={onClose}>
                    {isOwner ? "Cancel" : "Close"}
                  </Button>
                  {isOwner ? (
                    <Button isDisabled={save.isPending} onPress={() => void handleSave()}>
                      {save.isPending ? "Saving…" : "Save changes"}
                    </Button>
                  ) : null}
                </div>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AgenticTargetingDialog
        isOpen={targetingOpen}
        onClose={() => setTargetingOpen(false)}
        chats={chats}
        channel={channel}
        initialMode={targeting}
        initialSelected={selectedIds}
        onApply={(mode_, ids) => {
          markTouched();
          setTargeting(mode_);
          setSelectedIds(ids);
          setTargetingOpen(false);
        }}
      />
    </>
  );
}

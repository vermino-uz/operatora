"use client";

import { useState, type ReactNode } from "react";
import {
  Ban,
  Clock,
  CreditCard,
  FaceRobot,
  File,
  MapPin,
  Persons as Users2,
  Plus,
  SquareXmark,
  Tag,
  Handset,
} from "@gravity-ui/icons";

import type {
  AgentProduct,
  AgentTone,
  PricingDisclosure,
  WorkspaceAgentProfile,
  WorkspaceAgentProfileInput,
} from "@/services/api/agentic";
import { useSaveAgentProfile } from "@/features/messages/hooks/useAgentic";
import {
  DAY_LABELS,
  DAY_ORDER,
  INPUT_CLS,
  LANG_LABELS,
  LANG_OPTIONS,
  PAYMENT_LABELS,
  PAYMENT_OPTIONS,
  PRICING_DISCLOSURE_LABELS,
  PRICING_DISCLOSURE_OPTIONS,
  TONE_DESCRIPTIONS,
  TONE_LABELS,
  TONE_OPTIONS,
} from "@/features/messages/components/agentic/constants";
import { ChipButton, StatusBanner } from "@/features/messages/components/agentic/agenticUi";

type ProfileEditKey =
  | "identity"
  | "location"
  | "hours"
  | "languages"
  | "tone"
  | "pricing_disclosure"
  | "human_contact"
  | "payments"
  | "products"
  | "never_do"
  | "extra";

export function AgenticBusinessProfilePane({ profile }: { profile: WorkspaceAgentProfile | undefined }) {
  const saveProfile = useSaveAgentProfile();
  const [editing, setEditing] = useState<ProfileEditKey | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const days = (profile?.working_days || [])
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");

  const loc = [profile?.city?.trim(), profile?.address?.trim()].filter(Boolean).join(" — ");
  const products = (profile?.products || []).filter((p) => p?.name?.trim());
  const never = (profile?.never_do || []).map((s) => s.trim()).filter(Boolean);

  async function saveField(patch: WorkspaceAgentProfileInput) {
    try {
      await saveProfile.mutateAsync(patch);
      setEditing(null);
      setFeedback({ kind: "success", message: "Business profile saved" });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not save profile",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">Business Profile</h3>
        <p className="mt-0.5 text-xs text-foreground/60">
          Click any card to edit. Shared across Telegram and Instagram.
        </p>
      </div>

      {feedback ? <StatusBanner kind={feedback.kind} message={feedback.message} /> : null}

      {editing === "identity" ? (
        <IdentityEditor
          profile={profile}
          busy={saveProfile.isPending}
          onCancel={() => setEditing(null)}
          onSave={(patch) => void saveField(patch)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("identity")}
          className="w-full rounded-xl border border-black/10 bg-[var(--default)] px-4 py-4 text-left transition-colors hover:border-[#7C3AED]/40 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          <div className="mb-1 text-[11px] font-medium text-foreground/40">Click to edit</div>
          <div className="text-lg font-semibold text-foreground">
            {profile?.business_name?.trim() || "Not set up yet"}
          </div>
          <p className="mt-1 text-[13px] leading-[19px] text-foreground/60">
            {profile?.tagline?.trim() || "Add what you do…"}
          </p>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FactCard
          icon={<MapPin className="size-3.5" />}
          label="Location"
          value={loc || "—"}
          editing={editing === "location"}
          onClick={() => setEditing("location")}
        >
          <LocationEditor
            profile={profile}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(patch) => void saveField(patch)}
          />
        </FactCard>
        <FactCard
          icon={<Clock className="size-3.5" />}
          label="Working hours"
          value={
            days && profile?.hours_start && profile?.hours_end
              ? `${days} ${profile.hours_start}–${profile.hours_end}${profile.timezone ? ` (${profile.timezone})` : ""}`
              : "—"
          }
          editing={editing === "hours"}
          onClick={() => setEditing("hours")}
        >
          <HoursEditor
            profile={profile}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(patch) => void saveField(patch)}
          />
        </FactCard>
        <FactCard
          icon={<Users2 className="size-3.5" />}
          label="Languages"
          value={profile?.languages?.length ? profile.languages.map((l) => LANG_LABELS[l] || l).join(", ") : "—"}
          editing={editing === "languages"}
          onClick={() => setEditing("languages")}
        >
          <ChipMultiEditor
            options={LANG_OPTIONS.map((l) => ({ value: l, label: LANG_LABELS[l] || l }))}
            selected={profile?.languages || []}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(languages) => void saveField({ languages })}
          />
        </FactCard>
        <FactCard
          icon={<FaceRobot className="size-3.5" />}
          label="Tone"
          value={profile?.tone ? TONE_LABELS[profile.tone] : "—"}
          editing={editing === "tone"}
          onClick={() => setEditing("tone")}
        >
          <ToneEditor
            tone={profile?.tone || null}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(tone) => void saveField({ tone })}
          />
        </FactCard>
        <FactCard
          icon={<Tag className="size-3.5" />}
          label="Pricing disclosure"
          value={profile?.pricing_disclosure ? PRICING_DISCLOSURE_LABELS[profile.pricing_disclosure] : "—"}
          editing={editing === "pricing_disclosure"}
          onClick={() => setEditing("pricing_disclosure")}
        >
          <PricingDisclosureEditor
            pricingDisclosure={profile?.pricing_disclosure || null}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(pricing_disclosure) => void saveField({ pricing_disclosure })}
          />
        </FactCard>
        <FactCard
          icon={<Handset className="size-3.5" />}
          label="Human contact"
          value={profile?.human_contact?.trim() || "—"}
          editing={editing === "human_contact"}
          onClick={() => setEditing("human_contact")}
        >
          <TextFieldEditor
            initial={profile?.human_contact || ""}
            placeholder="+998… or @username"
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(v) => void saveField({ human_contact: v.trim() || null })}
          />
        </FactCard>
        <FactCard
          icon={<CreditCard className="size-3.5" />}
          label="Payments"
          value={
            profile?.payment_methods?.length
              ? profile.payment_methods.map((p) => PAYMENT_LABELS[p] || p).join(", ")
              : "—"
          }
          editing={editing === "payments"}
          onClick={() => setEditing("payments")}
        >
          <ChipMultiEditor
            options={PAYMENT_OPTIONS.map((p) => ({ value: p, label: PAYMENT_LABELS[p] || p }))}
            selected={profile?.payment_methods || []}
            busy={saveProfile.isPending}
            onCancel={() => setEditing(null)}
            onSave={(payment_methods) => void saveField({ payment_methods })}
          />
        </FactCard>
      </div>

      <FactCard
        icon={<Tag className="size-3.5" />}
        label="Top products"
        value={
          products.length
            ? products.map((p) => (p.price?.trim() ? `${p.name} (${p.price})` : p.name)).join(" · ")
            : "—"
        }
        editing={editing === "products"}
        onClick={() => setEditing("products")}
        wide
      >
        <ProductsEditor
          products={profile?.products || []}
          busy={saveProfile.isPending}
          onCancel={() => setEditing(null)}
          onSave={(products_) => void saveField({ products: products_ })}
        />
      </FactCard>

      <FactCard
        icon={<Ban className="size-3.5" />}
        label="Never do / say"
        value={never.length ? never.join("; ") : "—"}
        editing={editing === "never_do"}
        onClick={() => setEditing("never_do")}
        wide
      >
        <ListEditor
          items={profile?.never_do || []}
          placeholder="e.g. Don't invent discounts"
          busy={saveProfile.isPending}
          onCancel={() => setEditing(null)}
          onSave={(never_do) => void saveField({ never_do })}
        />
      </FactCard>

      <FactCard
        icon={<File className="size-3.5" />}
        label="Extra rules"
        value={profile?.extra_instructions?.trim() || "—"}
        editing={editing === "extra"}
        onClick={() => setEditing("extra")}
        wide
      >
        <TextAreaEditor
          initial={profile?.extra_instructions || ""}
          placeholder="Anything else the agent should know…"
          busy={saveProfile.isPending}
          onCancel={() => setEditing(null)}
          onSave={(v) => void saveField({ extra_instructions: v.trim() || null })}
        />
      </FactCard>
    </div>
  );
}

function FactCard({
  icon,
  label,
  value,
  editing,
  onClick,
  wide,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  editing?: boolean;
  onClick?: () => void;
  wide?: boolean;
  children?: ReactNode;
}) {
  if (editing) {
    return (
      <div
        className={`rounded-lg border border-[#7C3AED]/40 bg-[var(--default)] px-3.5 py-3 ${wide ? "sm:col-span-2" : ""}`}
      >
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground/40">
          <span className="text-[#7C3AED]">{icon}</span>
          {label}
        </div>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border border-black/10 bg-[var(--default)] px-3.5 py-3 text-left transition-colors hover:border-[#7C3AED]/40 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 ${wide ? "w-full" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/40">
        <span className="text-[#7C3AED]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 line-clamp-3 break-words text-[13px] text-foreground">{value}</div>
    </button>
  );
}

function EditActions({
  busy,
  onCancel,
  onSave,
  saveDisabled,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="h-8 rounded-lg px-3 text-xs font-medium text-foreground/60 hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || saveDisabled}
        className="h-8 rounded-lg bg-[#7C3AED] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function IdentityEditor({
  profile,
  busy,
  onCancel,
  onSave,
}: {
  profile: WorkspaceAgentProfile | undefined;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: WorkspaceAgentProfileInput) => void;
}) {
  const [name, setName] = useState(profile?.business_name || "");
  const [tagline, setTagline] = useState(profile?.tagline || "");
  return (
    <div className="rounded-xl border border-[#7C3AED]/40 bg-[var(--default)] px-4 py-4">
      <label className="mb-1 block text-[11px] font-medium text-foreground/40">Business name</label>
      <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operatora" autoFocus />
      <label className="mb-1 mt-3 block text-[11px] font-medium text-foreground/40">What do you do?</label>
      <textarea
        className={`${INPUT_CLS} min-h-[64px] resize-y`}
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        placeholder="1–2 sentences about what you offer"
        rows={2}
      />
      <EditActions
        busy={busy}
        onCancel={onCancel}
        saveDisabled={!name.trim()}
        onSave={() => onSave({ business_name: name.trim(), tagline: tagline.trim() || null })}
      />
    </div>
  );
}

function LocationEditor({
  profile,
  busy,
  onCancel,
  onSave,
}: {
  profile: WorkspaceAgentProfile | undefined;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: WorkspaceAgentProfileInput) => void;
}) {
  const [city, setCity] = useState(profile?.city || "");
  const [address, setAddress] = useState(profile?.address || "");
  return (
    <div className="space-y-2">
      <input className={INPUT_CLS} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Tashkent, Chilonzor" autoFocus />
      <input className={INPUT_CLS} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, landmark (optional)" />
      <EditActions
        busy={busy}
        onCancel={onCancel}
        onSave={() => onSave({ city: city.trim() || null, address: address.trim() || null })}
      />
    </div>
  );
}

function HoursEditor({
  profile,
  busy,
  onCancel,
  onSave,
}: {
  profile: WorkspaceAgentProfile | undefined;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: WorkspaceAgentProfileInput) => void;
}) {
  const [days, setDays] = useState<number[]>(
    profile?.working_days?.length ? [...profile.working_days] : [1, 2, 3, 4, 5],
  );
  const [start, setStart] = useState(profile?.hours_start || "09:00");
  const [end, setEnd] = useState(profile?.hours_end || "18:00");
  const [tz, setTz] = useState(profile?.timezone || "");

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DAY_ORDER.map((d) => (
          <ChipButton key={d} selected={days.includes(d)} onClick={() => toggleDay(d)}>
            {DAY_LABELS[d]}
          </ChipButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="time" className={INPUT_CLS} value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" className={INPUT_CLS} value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <input className={INPUT_CLS} value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Asia/Tashkent" />
      <EditActions
        busy={busy}
        onCancel={onCancel}
        saveDisabled={days.length === 0}
        onSave={() =>
          onSave({
            working_days: days,
            hours_start: start,
            hours_end: end,
            timezone: tz.trim() || null,
          })
        }
      />
    </div>
  );
}

function ChipMultiEditor({
  options,
  selected,
  busy,
  onCancel,
  onSave,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  busy: boolean;
  onCancel: () => void;
  onSave: (values: string[]) => void;
}) {
  const [values, setValues] = useState<string[]>([...selected]);
  function toggle(v: string) {
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <ChipButton key={o.value} selected={values.includes(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </ChipButton>
        ))}
      </div>
      <EditActions busy={busy} onCancel={onCancel} onSave={() => onSave(values)} />
    </div>
  );
}

function ToneEditor({
  tone,
  busy,
  onCancel,
  onSave,
}: {
  tone: AgentTone | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (tone: AgentTone | null) => void;
}) {
  const [value, setValue] = useState<AgentTone | null>(tone);
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {TONE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(opt)}
            className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
              value === opt ? "border-[#7C3AED] bg-[#7C3AED]/5 text-foreground" : "border-black/10 text-foreground/60 dark:border-white/10"
            }`}
          >
            <div>{TONE_LABELS[opt]}</div>
            <div className="mt-0.5 text-[11px] font-normal text-foreground/50">{TONE_DESCRIPTIONS[opt]}</div>
          </button>
        ))}
      </div>
      <EditActions busy={busy} onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  );
}

function PricingDisclosureEditor({
  pricingDisclosure,
  busy,
  onCancel,
  onSave,
}: {
  pricingDisclosure: PricingDisclosure | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (pricingDisclosure: PricingDisclosure | null) => void;
}) {
  const [value, setValue] = useState<PricingDisclosure | null>(pricingDisclosure);
  return (
    <div>
      <div className="grid grid-cols-1 gap-1.5">
        {PRICING_DISCLOSURE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(opt)}
            className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
              value === opt ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-black/10 dark:border-white/10"
            }`}
          >
            {PRICING_DISCLOSURE_LABELS[opt]}
          </button>
        ))}
      </div>
      <EditActions busy={busy} onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  );
}

function TextFieldEditor({
  initial,
  placeholder,
  busy,
  onCancel,
  onSave,
}: {
  initial: string;
  placeholder: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <input className={INPUT_CLS} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus />
      <EditActions busy={busy} onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  );
}

function TextAreaEditor({
  initial,
  placeholder,
  busy,
  onCancel,
  onSave,
}: {
  initial: string;
  placeholder: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <textarea
        className={`${INPUT_CLS} min-h-[72px] resize-y`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus
      />
      <EditActions busy={busy} onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  );
}

function ProductsEditor({
  products,
  busy,
  onCancel,
  onSave,
}: {
  products: AgentProduct[];
  busy: boolean;
  onCancel: () => void;
  onSave: (products: AgentProduct[]) => void;
}) {
  const [rows, setRows] = useState<AgentProduct[]>(
    products.length ? products.map((p) => ({ name: p.name, price: p.price ?? "" })) : [{ name: "", price: "" }],
  );
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={`${INPUT_CLS} flex-[2]`}
            value={row.name}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], name: e.target.value };
              setRows(next);
            }}
            placeholder="Name"
            autoFocus={i === 0}
          />
          <input
            className={`${INPUT_CLS} flex-1`}
            value={row.price || ""}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], price: e.target.value };
              setRows(next);
            }}
            placeholder="Price (optional)"
          />
          {rows.length > 1 ? (
            <button type="button" className="px-1 text-foreground/40" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
              <SquareXmark className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {rows.length < 10 ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED]"
          onClick={() => setRows([...rows, { name: "", price: "" }])}
        >
          <Plus className="size-3.5" />
          Add product
        </button>
      ) : null}
      <EditActions
        busy={busy}
        onCancel={onCancel}
        onSave={() =>
          onSave(
            rows
              .map((p) => ({ name: p.name.trim(), price: p.price?.trim() || null }))
              .filter((p) => p.name),
          )
        }
      />
    </div>
  );
}

function ListEditor({
  items,
  placeholder,
  busy,
  onCancel,
  onSave,
}: {
  items: string[];
  placeholder: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (items: string[]) => void;
}) {
  const [rows, setRows] = useState<string[]>(items.length ? [...items] : [""]);
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={`${INPUT_CLS} flex-1`}
            value={row}
            onChange={(e) => {
              const next = [...rows];
              next[i] = e.target.value;
              setRows(next);
            }}
            placeholder={placeholder}
            autoFocus={i === 0}
          />
          {rows.length > 1 ? (
            <button type="button" className="px-1 text-foreground/40" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
              <SquareXmark className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED]"
        onClick={() => setRows([...rows, ""])}
      >
        <Plus className="size-3.5" />
        Add
      </button>
      <EditActions
        busy={busy}
        onCancel={onCancel}
        onSave={() => onSave(rows.map((s) => s.trim()).filter(Boolean))}
      />
    </div>
  );
}

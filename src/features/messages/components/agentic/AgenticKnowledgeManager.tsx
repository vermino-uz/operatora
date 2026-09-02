"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowUpFromLine,
  CircleCheck,
  CircleExclamation,
  Eye,
  File,
  Link as LinkIcon,
  ArrowRotateRight,
  ChevronUp,
  TrashBin,
} from "@gravity-ui/icons";

import type { AgenticChannel, KnowledgeSource } from "@/services/api/agentic";
import {
  useAddKnowledgeText,
  useAddKnowledgeUrl,
  useAvailableKnowledge,
  useDeleteKnowledge,
  useKnowledge,
  useKnowledgeSourceContent,
  useSetKnowledgeChannel,
  useUploadKnowledge,
} from "@/features/messages/hooks/useAgentic";
import { StatusBanner } from "@/features/messages/components/agentic/agenticUi";

const ALL_CHANNELS: AgenticChannel[] = ["telegram", "instagram"];
type Mode = "text" | "file" | "url";

export interface AgenticKnowledgeManagerProps {
  active: boolean;
  channel?: AgenticChannel;
  variant?: "default" | "dataFeed";
}

export function AgenticKnowledgeManager({
  active,
  channel = "telegram",
  variant = "default",
}: AgenticKnowledgeManagerProps) {
  const { data: sources = [], isLoading } = useKnowledge(active, channel);
  const addText = useAddKnowledgeText(channel);
  const addUrl = useAddKnowledgeUrl(channel);
  const upload = useUploadKnowledge(channel);
  const del = useDeleteKnowledge(channel);
  const { data: available = [] } = useAvailableKnowledge(active, channel);
  const setChannel = useSetKnowledgeChannel(channel);

  const allSources = useMemo(() => {
    const byId = new Map<string, KnowledgeSource>();
    for (const s of sources) byId.set(s.id, s);
    for (const s of available) if (!byId.has(s.id)) byId.set(s.id, s);
    return Array.from(byId.values());
  }, [sources, available]);

  const isDataFeed = variant === "dataFeed";
  const [mode, setMode] = useState<Mode>(isDataFeed ? "file" : "text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = addText.isPending || addUrl.isPending || upload.isPending;

  function modeLabel(m: Mode) {
    if (m === "text") return isDataFeed ? "Manual" : "Text";
    if (m === "file") return isDataFeed ? "Upload" : "File";
    return "URL";
  }

  const fileAccept =
    ".xlsx,.xls,.csv,.pdf,.docx,.txt,.md,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/plain";

  async function handleAddText() {
    if (!text.trim()) return;
    try {
      await addText.mutateAsync({
        title: title.trim() || (isDataFeed ? "Manual product list" : "Pasted text"),
        text,
      });
      setTitle("");
      setText("");
      setFeedback({ kind: "success", message: "Added to knowledge base" });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not add",
      });
    }
  }

  async function handleAddUrl() {
    if (!url.trim()) return;
    try {
      await addUrl.mutateAsync(url.trim());
      setUrl("");
      setFeedback({ kind: "success", message: "Fetching page…" });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not add",
      });
    }
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      setFeedback({ kind: "success", message: `Uploading ${file.name}…` });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Upload failed",
      });
    }
  }

  async function handleSetChannel(source: KnowledgeSource, targetChannel: AgenticChannel, enabled: boolean) {
    try {
      await setChannel.mutateAsync({ id: source.id, targetChannel, enabled });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not update channel",
      });
    }
  }

  return (
    <div>
      {feedback ? <StatusBanner kind={feedback.kind} message={feedback.message} /> : null}

      <div className="mb-3 flex items-center gap-1">
        {(["file", "text", "url"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              mode === m ? "bg-[#7C3AED] text-white" : "bg-black/5 text-foreground/70 dark:bg-white/10"
            }`}
          >
            {modeLabel(m)}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isDataFeed ? "Title (e.g. Summer catalog)" : "Title (e.g. Pricing, FAQ)"}
            className="h-9 w-full rounded-lg bg-black/5 px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isDataFeed
                ? "One product per line — name, price, short description…"
                : "Paste product info, prices, FAQ, policies…"
            }
            rows={7}
            className="min-h-[160px] w-full resize-y rounded-lg bg-black/5 px-3 py-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
          />
          <button
            type="button"
            onClick={() => void handleAddText()}
            disabled={busy || !text.trim()}
            className="h-9 rounded-lg bg-[#7C3AED] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isDataFeed ? "Add products" : "Add text"}
          </button>
        </div>
      ) : null}

      {mode === "url" ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com/product"
              className="h-9 w-full rounded-lg bg-black/5 pl-9 pr-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAddUrl()}
            disabled={busy || !url.trim()}
            className="h-9 rounded-lg bg-[#7C3AED] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}

      {mode === "file" ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={fileAccept}
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-black/10 text-[13px] text-foreground/60 transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            {upload.isPending ? (
              <ArrowRotateRight className="size-5 animate-spin text-[#7C3AED]" />
            ) : (
              <ArrowUpFromLine className="size-5 text-[#7C3AED]" />
            )}
            <span className="font-medium text-foreground">
              {isDataFeed ? "Upload Excel or CSV" : "Click to upload Excel / CSV / PDF / DOCX / TXT (max 20 MB)"}
            </span>
            {isDataFeed ? (
              <span className="px-4 text-center text-[11px] text-foreground/40">
                Also accepts PDF, DOCX, TXT · max 20 MB
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      <div className="-mx-3 mt-3 max-h-[280px] overflow-y-auto px-1">
        {isLoading ? (
          <div className="py-6 text-center text-[13px] text-foreground/40">Loading…</div>
        ) : allSources.length === 0 ? (
          <div className="py-6 text-center">
            <File className="mx-auto mb-1.5 size-6 text-foreground/30" />
            <p className="text-[13px] text-foreground/40">
              {isDataFeed ? "No catalog yet. Upload a spreadsheet or enter products manually." : "No knowledge yet. Add some above."}
            </p>
          </div>
        ) : (
          allSources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              channel={channel}
              expanded={expandedId === s.id}
              onToggleView={() => setExpandedId((cur) => (cur === s.id ? null : s.id))}
              onDelete={() => del.mutate(s.id)}
              deleting={del.isPending && del.variables === s.id}
              onSetChannel={(targetChannel, enabled) => void handleSetChannel(s, targetChannel, enabled)}
              channelPending={
                setChannel.isPending && setChannel.variables?.id === s.id
                  ? setChannel.variables.targetChannel
                  : null
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function SourceRow({
  source,
  channel,
  expanded,
  onToggleView,
  onDelete,
  deleting,
  onSetChannel,
  channelPending,
}: {
  source: KnowledgeSource;
  channel: AgenticChannel;
  expanded: boolean;
  onToggleView: () => void;
  onDelete: () => void;
  deleting: boolean;
  onSetChannel: (targetChannel: AgenticChannel, enabled: boolean) => void;
  channelPending: AgenticChannel | null;
}) {
  const Icon = source.kind === "url" ? LinkIcon : source.kind === "file" ? ArrowUpFromLine : File;
  const { data: content, isLoading: contentLoading } = useKnowledgeSourceContent(
    expanded ? source.id : null,
    channel,
  );
  const inCurrentChannel = source.channels?.includes(channel);

  return (
    <div className={`rounded-lg ${expanded ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"}`}>
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
        onClick={onToggleView}
        role="button"
        aria-expanded={expanded}
      >
        <Icon className="size-4 shrink-0 text-foreground/60" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">{source.title}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
            <StatusBadge source={source} />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {ALL_CHANNELS.map((ch) => {
              const on = !!source.channels?.includes(ch);
              const pending = channelPending === ch;
              const channelName = ch === "telegram" ? "Telegram" : "Instagram";
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => onSetChannel(ch, !on)}
                  disabled={pending}
                  className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10.5px] font-medium transition-colors disabled:opacity-60 ${
                    on ? "bg-[#7C3AED]/15 text-[#7C3AED]" : "bg-black/5 text-foreground/40 dark:bg-white/10"
                  }`}
                  title={`Use this data for ${channelName}`}
                >
                  {pending ? <ArrowRotateRight className="size-2.5 animate-spin" /> : (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-[#7C3AED]" : "bg-foreground/30"}`} />
                  )}
                  {channelName}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleView();
          }}
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            expanded ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-foreground/40 hover:bg-black/5 dark:hover:bg-white/10"
          }`}
          title="View"
        >
          {expanded ? <ChevronUp className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        {inCurrentChannel ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/40 hover:bg-danger/10 hover:text-danger"
            title="Delete"
          >
            {deleting ? <ArrowRotateRight className="size-3.5 animate-spin" /> : <TrashBin className="size-3.5" />}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="mx-3 mb-2.5 rounded-md border border-black/10 bg-[var(--default)] px-3 py-2.5 dark:border-white/10">
          {contentLoading ? (
            <div className="flex items-center gap-2 py-1 text-xs text-foreground/40">
              <ArrowRotateRight className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : content?.text?.trim() ? (
            <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-[18px] text-foreground/70">
              {content.text}
            </pre>
          ) : (
            <div className="py-1 text-xs text-foreground/40">No text available</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ source }: { source: KnowledgeSource }) {
  if (source.status === "ready") {
    const chunkLabel = source.chunk_count === 1 ? "chunk" : "chunks";
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="size-3" />
        Ready · {source.chunk_count} {chunkLabel}
      </span>
    );
  }
  if (source.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-danger" title={source.error || ""}>
        <CircleExclamation className="size-3" />
        Failed{source.error ? ` · ${source.error.slice(0, 40)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
      <ArrowRotateRight className="size-3 animate-spin" />
      {source.status === "processing" ? "Processing…" : "Queued…"}
    </span>
  );
}

"use client";

import { Button, Chip, Switch } from "@heroui/react";
import { BroadcastSignal, ArrowUpRightFromSquare, TrashBin } from "@gravity-ui/icons";

import type { GoogleSheetsImportSource } from "@/features/google-sheets/types";
import type { LeadsBoardOption } from "@/services/api/leadsBoards";

export function ImportSourceRow({
  source,
  boards,
  onToggleAuto,
  onRemove,
  busy,
}: {
  source: GoogleSheetsImportSource;
  boards: LeadsBoardOption[];
  onToggleAuto: (enabled: boolean) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const boardName = boards.find((b) => b.id === source.import_board_id)?.name;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{source.name}</p>
          {source.realtime_sync_active ? (
            <Chip size="sm" color="success" variant="soft">
              <BroadcastSignal className="size-3" aria-hidden="true" />
              <Chip.Label>Live</Chip.Label>
            </Chip>
          ) : null}
        </div>
        <p className="truncate text-xs text-foreground/50">
          {source.sheet_tab_name}
          {boardName ? ` → ${boardName}` : ""}
          {source.last_import_at ? ` · last sync ${new Date(source.last_import_at).toLocaleString()}` : ""}
        </p>
      </div>
      {source.spreadsheet_url ? (
        <a
          href={source.spreadsheet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          title="Open spreadsheet"
        >
          <ArrowUpRightFromSquare className="size-4" aria-hidden="true" />
        </a>
      ) : null}
      <Switch
        isSelected={source.auto_import_new_leads}
        isDisabled={busy || !source.import_board_id}
        onChange={onToggleAuto}
        aria-label={`Auto-import new rows for ${source.name}`}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
      <Button
        size="sm"
        variant="danger-soft"
        isIconOnly
        aria-label="Remove this sheet"
        isDisabled={busy}
        onPress={onRemove}
      >
        <TrashBin className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

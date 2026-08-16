"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Modal, Select, Switch, TextField } from "@heroui/react";

import { googleSheetsApi } from "@/services/api/googleSheets";
import { useLeadsBoardColumnsQuery, useLeadsBoardsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import type { GoogleSpreadsheetOption } from "@/features/google-sheets/types";

/** Additional named import source — traced from the old frontend's
 * `AddImportSourceDialog`. Unlike the primary sheet, creation never gates
 * on an "existing rows" dialog: the backend's `initial_import_mode`
 * defaults to `'skip_existing'` for brand-new sources, matching old
 * exactly (see `CreateGoogleSheetsImportSourceDto`'s own doc comment). */
export function AddImportSourceModal({
  open,
  onOpenChange,
  workspaceId,
  spreadsheets,
  onCreate,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  spreadsheets: GoogleSpreadsheetOption[];
  onCreate: (input: {
    name: string;
    spreadsheet_id_or_url: string;
    sheet_tab_name: string;
    import_board_id: string | null;
    import_column_id: string | null;
    auto_import_new_leads: boolean;
  }) => void | Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [tab, setTab] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [boardId, setBoardId] = useState("");
  const [columnId, setColumnId] = useState("");
  const [autoImport, setAutoImport] = useState(false);

  // Query-backed (TanStack Query), not a manual fetch-in-effect — boards
  // list only needs to load while the modal is actually open, columns only
  // once a board is picked; both derive purely from render-time state
  // (`open`/`boardId`), no `useEffect`+`setState` pair needed.
  const boardsQuery = useLeadsBoardsQuery(workspaceId, open);
  const boards = boardsQuery.data ?? [];
  const columnsQuery = useLeadsBoardColumnsQuery(boardId || null);
  const columns = columnsQuery.data ?? [];

  function reset() {
    setName("");
    setSpreadsheetId("");
    setTab("");
    setTabs([]);
    setBoardId("");
    setColumnId("");
    setAutoImport(false);
  }

  async function onPickSpreadsheet(id: string) {
    setSpreadsheetId(id);
    setTab("");
    if (!id) {
      setTabs([]);
      return;
    }
    setLoadingTabs(true);
    try {
      const list = await googleSheetsApi.listTabs(workspaceId, id);
      setTabs(list);
      setTab(list[0] || "Leads");
      if (!name.trim()) {
        const picked = spreadsheets.find((s) => s.id === id);
        if (picked) setName(picked.name);
      }
    } finally {
      setLoadingTabs(false);
    }
  }

  const canSave = name.trim().length > 0 && spreadsheetId.length > 0 && !saving;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Add another sheet</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField value={name} onChange={setName}>
                <Label>Name</Label>
                <Input placeholder="e.g. Facebook Ads leads" />
              </TextField>

              <Select
                aria-label="Spreadsheet"
                value={spreadsheetId}
                onChange={(key) => typeof key === "string" && void onPickSpreadsheet(key)}
              >
                <Label>Spreadsheet</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox
                    items={
                      spreadsheets.length === 0
                        ? [{ id: "", label: "No spreadsheets found" }]
                        : spreadsheets.map((s) => ({ id: s.id, label: s.name }))
                    }
                  >
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>

              {spreadsheetId ? (
                <Select
                  aria-label="Worksheet tab"
                  value={tab}
                  onChange={(key) => typeof key === "string" && setTab(key)}
                  isDisabled={loadingTabs}
                >
                  <Label>Worksheet tab</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={(tabs.length === 0 ? [tab || "Leads"] : tabs).map((t) => ({ id: t, label: t }))}>
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : null}

              <Select
                aria-label="Target board"
                value={boardId}
                onChange={(key) => {
                  if (typeof key !== "string") return;
                  setBoardId(key);
                  setColumnId("");
                }}
              >
                <Label>Target board</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox
                    items={
                      boards.length === 0
                        ? [{ id: "", label: "No boards — create one in Leads" }]
                        : boards.map((b) => ({ id: b.id, label: b.name }))
                    }
                  >
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>

              {boardId ? (
                <Select
                  aria-label="Target column"
                  value={columnId}
                  onChange={(key) => typeof key === "string" && setColumnId(key)}
                  isDisabled={columnsQuery.isLoading}
                >
                  <Label>Target column</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox
                      items={
                        columns.length === 0
                          ? [{ id: "", label: "No columns on this board" }]
                          : [{ id: "", label: "First column (default)" }, ...columns.map((c) => ({ id: c.id, label: c.name }))]
                      }
                    >
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : null}

              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="text-foreground">Auto-sync new rows</span>
                  <span className="mt-0.5 block text-xs text-foreground/50">
                    {!boardId
                      ? "Select a target board to enable auto-sync."
                      : "Existing rows are marked as a baseline; only rows added from now on come in."}
                  </span>
                </span>
                <Switch
                  isSelected={autoImport}
                  isDisabled={!boardId}
                  onChange={setAutoImport}
                  aria-label="Auto-sync new rows"
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </label>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                isDisabled={!canSave}
                onPress={() =>
                  void onCreate({
                    name: name.trim(),
                    spreadsheet_id_or_url: spreadsheetId,
                    sheet_tab_name: tab || "Leads",
                    import_board_id: boardId || null,
                    import_column_id: columnId || null,
                    auto_import_new_leads: autoImport && !!boardId,
                  })
                }
              >
                {saving ? "Adding…" : "Add sheet"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

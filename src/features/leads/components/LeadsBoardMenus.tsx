"use client";

import type { ReactNode } from "react";
import { Dropdown } from "@heroui/react";
import { Header } from "react-aria-components/Header";
import type { LeadViewMode } from "@/features/leads/types";
import {
  ArrowDownToSquare,
  ArrowUpFromSquare,
  BarsDescendingAlignLeftArrowDown,
  ChevronDown,
  CodeMerge,
  Envelope,
  Eye,
  GearPlay,
  LayoutColumns,
  ListCheck,
  MagicWand,
  Thunderbolt,
} from "@gravity-ui/icons";

function ActionMenu({ label, active = false, children }: { label: string; active?: boolean; children: ReactNode }) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        className={`button button--sm !inline-flex shrink-0 ${active ? "button--secondary" : "button--ghost"}`}
      >
        {label}
        <ChevronDown className="size-3.5 text-foreground/45" aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={label} className="min-w-[220px]">
          {children}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dropdown.Section>
      <Header className="px-2 pb-1 pt-1.5 text-xs font-medium text-foreground/45">{title}</Header>
      {children}
    </Dropdown.Section>
  );
}

function MenuAction({
  id,
  label,
  icon,
  onAction,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  onAction: () => void;
}) {
  return (
    <Dropdown.Item id={id} onAction={onAction}>
      {icon}
      {label}
    </Dropdown.Item>
  );
}

export function LeadsBoardMenus({
  showLeadTools,
  viewMode,
  sortByAiScore,
  canDistributeLeads,
  canBulkSms,
  onManageColumns,
  onManageFields,
  onFieldVisibility,
  onAutomations,
  onToggleSortByAiScore,
  onAiDistribution,
  onBulkActions,
  onDuplicates,
  onSmsTemplates,
  onImport,
  onExport,
  onComposeSms,
}: {
  showLeadTools: boolean;
  viewMode: LeadViewMode;
  sortByAiScore: boolean;
  canDistributeLeads: boolean;
  canBulkSms: boolean;
  onManageColumns: () => void;
  onManageFields: () => void;
  onFieldVisibility: () => void;
  onAutomations: () => void;
  onToggleSortByAiScore: () => void;
  onAiDistribution: () => void;
  onBulkActions: () => void;
  onDuplicates: () => void;
  onSmsTemplates: () => void;
  onImport: () => void;
  onExport: () => void;
  onComposeSms: () => void;
}) {
  return (
    <>
      {showLeadTools ? (
        <ActionMenu label="Actions" active={sortByAiScore && viewMode === "board"}>
          <MenuGroup title="Setup">
            <MenuAction id="columns" label="Manage columns" icon={<LayoutColumns className="size-3.5" aria-hidden="true" />} onAction={onManageColumns} />
            <MenuAction id="fields" label="Custom fields" icon={<ListCheck className="size-3.5" aria-hidden="true" />} onAction={onManageFields} />
            <MenuAction id="visibility" label="Field visibility" icon={<Eye className="size-3.5" aria-hidden="true" />} onAction={onFieldVisibility} />
            <MenuAction id="automations" label="Automations" icon={<GearPlay className="size-3.5" aria-hidden="true" />} onAction={onAutomations} />
          </MenuGroup>
          <MenuGroup title="Leads">
            {viewMode === "board" ? (
              <MenuAction
                id="sort-ai"
                label={sortByAiScore ? "Stop sorting by AI score" : "Sort by AI score"}
                icon={<BarsDescendingAlignLeftArrowDown className="size-3.5" aria-hidden="true" />}
                onAction={onToggleSortByAiScore}
              />
            ) : null}
            {canDistributeLeads ? (
              <MenuAction id="ai-distribute" label="AI lead distribution" icon={<MagicWand className="size-3.5" aria-hidden="true" />} onAction={onAiDistribution} />
            ) : null}
            <MenuAction id="bulk" label="Bulk actions (filtered)" icon={<Thunderbolt className="size-3.5" aria-hidden="true" />} onAction={onBulkActions} />
            <MenuAction id="duplicates" label="Find duplicates" icon={<CodeMerge className="size-3.5" aria-hidden="true" />} onAction={onDuplicates} />
          </MenuGroup>
          <MenuGroup title="Data">
            <MenuAction id="import" label="Import" icon={<ArrowUpFromSquare className="size-3.5" aria-hidden="true" />} onAction={onImport} />
            <MenuAction id="export" label="Export" icon={<ArrowDownToSquare className="size-3.5" aria-hidden="true" />} onAction={onExport} />
            <MenuAction id="sms-templates" label="SMS templates" icon={<Envelope className="size-3.5" aria-hidden="true" />} onAction={onSmsTemplates} />
            {canBulkSms ? (
              <MenuAction id="compose-sms" label="Compose SMS" icon={<Envelope className="size-3.5" aria-hidden="true" />} onAction={onComposeSms} />
            ) : null}
          </MenuGroup>
        </ActionMenu>
      ) : null}
    </>
  );
}

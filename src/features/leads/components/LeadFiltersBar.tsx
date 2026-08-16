"use client";

import { useEffect, useState } from "react";
import { Button, DateField, DateRangePicker, Input, ListBox, NumberField, RangeCalendar, Select } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Magnifier as Search, FunnelXmark } from "@gravity-ui/icons";

import { useDebounce } from "@/hooks/useDebounce";
import {
  ACADEMIC_STATUS_OPTIONS,
  EMPTY_LEAD_FILTERS,
  LEAD_CHANNEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  type LeadFilters,
} from "@/features/leads/types";

export interface LeadFiltersBarProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  operators: { id: string; label: string }[];
}

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

/**
 * Full filter bar for `GET /lead-board/:boardId`'s real query params (see
 * `LeadFilters`'s doc comment) — same layout/debounce/clear pattern as
 * `ConversationFilters.tsx` (this app's other established filter bar), not
 * a separately-invented pattern. Rendered as a toggled row under the Leads
 * page header (see `page.tsx`), not always-visible, since the board itself
 * needs the vertical space `ConversationsTable` doesn't compete for.
 */
export function LeadFiltersBar({ filters, onChange, operators }: LeadFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 350);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onChange({ ...filters, search: debouncedSearch });
    }
    // Only re-run when the debounced value itself changes — `filters`/`onChange`
    // deliberately excluded to avoid a feedback loop with the parent's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const maritalOptions = [{ id: "", label: "Any" }, ...MARITAL_STATUS_OPTIONS.map((s) => ({ id: s, label: s }))];
  const academicOptions = [{ id: "", label: "Any" }, ...ACADEMIC_STATUS_OPTIONS.map((s) => ({ id: s, label: s }))];
  const channelOptions = [
    { id: "", label: "Any channel" },
    ...LEAD_CHANNEL_OPTIONS.map((c) => ({ id: c, label: CHANNEL_LABELS[c] ?? c })),
  ];
  const assignedOperatorOptions = [
    { id: "all", label: "All operators" },
    { id: "unassigned", label: "Unassigned" },
    ...operators,
  ];
  const createdByOptions = [{ id: "", label: "Anyone" }, ...operators];

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.maritalStatus) ||
    Boolean(filters.academicStatus) ||
    filters.ageFrom !== null ||
    filters.ageTo !== null ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.createdBy) ||
    Boolean(filters.channel) ||
    filters.assignedOperator !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
      <div className="relative w-56">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40"
          aria-hidden="true"
        />
        <Input
          aria-label="Search leads"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Name or phone…"
          className="pl-8"
          fullWidth
        />
      </div>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Marital status
        <Select
          aria-label="Marital status"
          value={filters.maritalStatus || ""}
          onChange={(key) => typeof key === "string" && onChange({ ...filters, maritalStatus: key })}
          variant="secondary"
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={maritalOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Academic status
        <Select
          aria-label="Academic status"
          value={filters.academicStatus || ""}
          onChange={(key) => typeof key === "string" && onChange({ ...filters, academicStatus: key })}
          variant="secondary"
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={academicOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Channel
        <Select
          aria-label="Channel"
          value={filters.channel || ""}
          onChange={(key) => typeof key === "string" && onChange({ ...filters, channel: key })}
          variant="secondary"
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={channelOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Assigned to
        <Select
          aria-label="Assigned operator"
          value={filters.assignedOperator}
          onChange={(key) => typeof key === "string" && onChange({ ...filters, assignedOperator: key })}
          variant="secondary"
          className="w-40"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={assignedOperatorOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Created by
        <Select
          aria-label="Created by"
          value={filters.createdBy || ""}
          onChange={(key) => typeof key === "string" && onChange({ ...filters, createdBy: key })}
          variant="secondary"
          className="w-40"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={createdByOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Age from
        <NumberField
          aria-label="Minimum age"
          minValue={0}
          maxValue={120}
          value={filters.ageFrom ?? undefined}
          onChange={(v) => onChange({ ...filters, ageFrom: v ?? null })}
          variant="secondary"
          className="w-20"
        >
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Age to
        <NumberField
          aria-label="Maximum age"
          minValue={0}
          maxValue={120}
          value={filters.ageTo ?? undefined}
          onChange={(v) => onChange({ ...filters, ageTo: v ?? null })}
          variant="secondary"
          className="w-20"
        >
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      </label>

      <label className="flex flex-col gap-1 text-xs text-foreground/50">
        Created date range
        <DateRangePicker
          aria-label="Created date range"
          value={filters.dateFrom && filters.dateTo ? { start: parseDate(filters.dateFrom), end: parseDate(filters.dateTo) } : null}
          onChange={(range) =>
            onChange({
              ...filters,
              dateFrom: range ? range.start.toString() : null,
              dateTo: range ? range.end.toString() : null,
            })
          }
          className="w-72"
        >
          <DateField.Group variant="secondary" fullWidth>
            <DateField.Input slot="start">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            <DateField.Suffix>
              <DateRangePicker.Trigger>
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover>
            <RangeCalendar aria-label="Created date range">
              <RangeCalendar.Header>
                <RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.YearPickerTriggerHeading />
                  <RangeCalendar.YearPickerTriggerIndicator />
                </RangeCalendar.YearPickerTrigger>
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
              </RangeCalendar.Grid>
              <RangeCalendar.YearPickerGrid>
                <RangeCalendar.YearPickerGridBody>
                  {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                </RangeCalendar.YearPickerGridBody>
              </RangeCalendar.YearPickerGrid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>
      </label>

      {hasActiveFilters ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            setSearchInput("");
            onChange(EMPTY_LEAD_FILTERS);
          }}
        >
          <FunnelXmark className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

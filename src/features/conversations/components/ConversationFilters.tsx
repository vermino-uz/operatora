"use client";

import { useEffect, useState } from "react";
import { Button, DateField, DateRangePicker, Input, ListBox, NumberField, RangeCalendar, Select } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Magnifier as Search, FunnelXmark } from "@gravity-ui/icons";
import { useDebounce } from "@/hooks/useDebounce";
import type { ConversationListFilters } from "@/features/conversations/types";

export interface ConversationFiltersProps {
  filters: ConversationListFilters;
  onChange: (filters: ConversationListFilters) => void;
  operators: string[];
  statuses: string[];
}

const EMPTY_FILTERS: ConversationListFilters = {};

/** Filter bar matching exactly what `GET /api/conversation` supports —
 * search, status, operator, date range, score range. No `channel`/
 * `sentiment` filter is offered client-side even though those are real
 * columns: no server param exists for them (see feature brief), and a
 * client-side-only filter that only applies to the current page would
 * misleadingly look like a real one. */
export function ConversationFilters({ filters, onChange, operators, statuses }: ConversationFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 350);

  // Push the debounced search value up once it settles.
  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? "")) {
      onChange({ ...filters, search: debouncedSearch || undefined });
    }
    // Only re-run when the debounced value itself changes — `filters`/`onChange`
    // deliberately excluded to avoid a feedback loop with the parent's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const statusOptions = [{ id: "all", label: "All statuses" }, ...statuses.map((s) => ({ id: s, label: s }))];
  const operatorOptions = [
    { id: "all", label: "All operators" },
    ...operators.map((o) => ({ id: o, label: o })),
  ];

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.operator || filters.fromDate || filters.toDate ||
      filters.minScore !== undefined || filters.maxScore !== undefined,
  );

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-divider px-3 py-3 md:px-6 md:py-4">
      <div className="relative w-full min-w-[12rem] sm:w-64">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          aria-label="Search conversations"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search client, operator, phone, summary…"
          className="pl-8"
          fullWidth
        />
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Status
        <Select
          aria-label="Status"
          value={filters.status ?? "all"}
          onChange={(key) => {
            if (typeof key === "string") {
              onChange({ ...filters, status: key === "all" ? undefined : key });
            }
          }}
          variant="secondary"
          className="w-full min-w-[8rem] sm:w-40"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            {/* Dynamic collection (`items` + render-prop child) — a plain
                `.map()` of JSX here silently drops React Aria's own keying
                for a data-driven list (see ChatComposer's model picker,
                which hit the same "missing key" warning). */}
            <ListBox items={statusOptions}>
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

      <label className="flex flex-col gap-1 text-xs text-muted">
        Operator
        <Select
          aria-label="Operator"
          value={filters.operator ?? "all"}
          onChange={(key) => {
            if (typeof key === "string") {
              onChange({ ...filters, operator: key === "all" ? undefined : key });
            }
          }}
          variant="secondary"
          className="w-full min-w-[8rem] sm:w-44"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={operatorOptions}>
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

      <label className="flex flex-col gap-1 text-xs text-muted">
        Date range
        <DateRangePicker
          aria-label="Date range"
          value={
            filters.fromDate && filters.toDate
              ? { start: parseDate(filters.fromDate), end: parseDate(filters.toDate) }
              : null
          }
          onChange={(range) =>
            onChange({
              ...filters,
              // The picker only produces a value once both ends are chosen —
              // clearing it clears the range as a pair, not independently
              // (a real UX difference from the old separate From/To inputs,
              // but the correct behavior for this component).
              fromDate: range ? range.start.toString() : undefined,
              toDate: range ? range.end.toString() : undefined,
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
            <RangeCalendar aria-label="Date range">
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

      <label className="flex flex-col gap-1 text-xs text-muted">
        Min score
        <NumberField
          aria-label="Minimum score"
          minValue={0}
          maxValue={100}
          value={filters.minScore}
          onChange={(v) => onChange({ ...filters, minScore: v })}
          variant="secondary"
          className="w-24"
        >
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Max score
        <NumberField
          aria-label="Maximum score"
          minValue={0}
          maxValue={100}
          value={filters.maxScore}
          onChange={(v) => onChange({ ...filters, maxScore: v })}
          variant="secondary"
          className="w-24"
        >
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      </label>

      {hasActiveFilters ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            setSearchInput("");
            onChange(EMPTY_FILTERS);
          }}
        >
          <FunnelXmark className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

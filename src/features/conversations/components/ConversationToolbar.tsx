"use client";

import { useEffect, useState } from "react";
import { Button, DateField, DateRangePicker, Input, ListBox, RangeCalendar, Select } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Calendar, Gear, Magnifier as Search } from "@gravity-ui/icons";
import { useDebounce } from "@/hooks/useDebounce";
import type { ConversationListFilters } from "@/features/conversations/types";

export type ConversationStatusFilter = "all" | "new" | "analyzed" | "processing" | "failed";
export type ConversationRatingFilter = "all" | "80to100" | "50to79" | "below50";

export interface ConversationToolbarProps {
  filters: ConversationListFilters;
  onChange: (filters: ConversationListFilters) => void;
  operators: string[];
  totalCount: number;
  onOpenSettings: () => void;
  className?: string;
}

const STATUS_TABS: ConversationStatusFilter[] = ["all", "new", "analyzed", "processing", "failed"];

const RATING_OPTIONS: { id: ConversationRatingFilter; label: string }[] = [
  { id: "all", label: "All ratings" },
  { id: "80to100", label: "80–100" },
  { id: "50to79", label: "50–79" },
  { id: "below50", label: "Below 50" },
];

function ratingToScores(rating: ConversationRatingFilter): Pick<ConversationListFilters, "minScore" | "maxScore"> {
  switch (rating) {
    case "80to100":
      return { minScore: 80, maxScore: 100 };
    case "50to79":
      return { minScore: 50, maxScore: 79 };
    case "below50":
      return { maxScore: 49 };
    default:
      return {};
  }
}

function scoresToRating(filters: ConversationListFilters): ConversationRatingFilter {
  if (filters.minScore === 80 && filters.maxScore === 100) return "80to100";
  if (filters.minScore === 50 && filters.maxScore === 79) return "50to79";
  if (filters.maxScore === 49 && filters.minScore === undefined) return "below50";
  return "all";
}

function formatDateRangeLabel(from?: string, to?: string): string {
  if (!from) return "All time";
  if (to) return `${from} — ${to}`;
  return from;
}

export function ConversationToolbar({
  filters,
  onChange,
  operators,
  totalCount,
  onOpenSettings,
  className,
}: ConversationToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 350);
  const statusFilter = (filters.status?.toLowerCase() as ConversationStatusFilter) || "all";
  const ratingFilter = scoresToRating(filters);

  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? "")) {
      onChange({ ...filters, search: debouncedSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const operatorOptions = [
    { id: "all", label: "All operators" },
    ...operators.map((o) => ({ id: o, label: o })),
  ];

  return (
    <div className={`flex flex-col gap-0 border-b border-divider ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:gap-3 md:px-5">
        <div className="mr-1 flex shrink-0 items-center gap-2 sm:gap-3">
          <h1 className="text-base font-semibold text-foreground">Conversations</h1>
          <span className="text-[12px] text-muted sm:text-[13px]">{totalCount.toLocaleString()}</span>
        </div>

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
              fromDate: range ? range.start.toString() : undefined,
              toDate: range ? range.end.toString() : undefined,
            })
          }
        >
          <Button size="sm" variant="secondary" className="h-9 gap-2">
            <Calendar className="size-3.5" aria-hidden="true" />
            {formatDateRangeLabel(filters.fromDate, filters.toDate)}
          </Button>
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
            </RangeCalendar>
            <div className="flex justify-end border-t border-divider p-2">
              <Button
                size="sm"
                variant="ghost"
                onPress={() => onChange({ ...filters, fromDate: undefined, toDate: undefined })}
              >
                Clear
              </Button>
            </div>
          </DateRangePicker.Popover>
        </DateRangePicker>

        <Select
          aria-label="Operator"
          value={filters.operator ?? "all"}
          onChange={(key) => {
            if (typeof key === "string") {
              onChange({ ...filters, operator: key === "all" ? undefined : key });
            }
          }}
          variant="secondary"
          className="w-[9.5rem]"
        >
          <Select.Trigger className="h-9">
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

        <Select
          aria-label="Rating"
          value={ratingFilter}
          onChange={(key) => {
            if (typeof key === "string") {
              const scores = ratingToScores(key as ConversationRatingFilter);
              onChange({
                ...filters,
                minScore: scores.minScore,
                maxScore: scores.maxScore,
              });
            }
          }}
          variant="secondary"
          className="w-[8.5rem]"
        >
          <Select.Trigger className="h-9">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={RATING_OPTIONS}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((key) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onChange({ ...filters, status: key === "all" ? undefined : key })
                }
                className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "border border-divider bg-background text-foreground/70 hover:bg-[var(--default)]"
                }`}
              >
                {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="hidden flex-1 md:block" />

        <div className="relative w-full sm:w-[220px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            aria-label="Search conversations"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            className="h-9 pl-9"
            fullWidth
          />
        </div>

        <Button
          size="sm"
          variant="secondary"
          isIconOnly
          aria-label="Conversation settings"
          onPress={onOpenSettings}
          className="size-9"
        >
          <Gear className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

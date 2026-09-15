"use client";

import { ListBox, Select } from "@heroui/react";

export interface AdminSelectOption {
  id: string;
  label: string;
}

/** Thin wrapper over HeroUI's compound `Select` for the many plain
 * label/value filter dropdowns admin list pages need (tier, status, sort,
 * kind, ...) — avoids repeating the same Select/ListBox/Item boilerplate
 * (see `features/finance/components/AuditLogTab.tsx` for the pattern this
 * generalizes). */
export function AdminSelect({
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  className,
}: {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  className?: string;
}) {
  return (
    <Select aria-label={ariaLabel} value={value} onChange={(key) => typeof key === "string" && onChange(key)} className={className}>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={options}>
          {(opt) => (
            <ListBox.Item id={opt.id} textValue={opt.label}>
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

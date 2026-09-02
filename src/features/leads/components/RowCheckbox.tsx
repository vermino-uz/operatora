"use client";

import { useEffect, useRef } from "react";

/** Plain native checkbox with `indeterminate` support — same pattern as
 * `AmocrmBoardsModal.tsx`'s `BoardCheckbox` (avoids guessing at an
 * unverified HeroUI `Checkbox` compound anatomy for a one-off tri-state
 * "select all on this page" control), reused here for every row-selection
 * surface this slice adds (List table, Kanban cards, Archived table). */
export function RowCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  /** Stop the click from bubbling to a parent row's own click handler
   * (opening the lead details modal / starting a drag), since a checkbox
   * click should only ever toggle selection. */
  onClick?: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={label}
      className="size-4 shrink-0 cursor-pointer rounded-md accent-primary"
    />
  );
}

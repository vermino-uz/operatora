/** Calendar-day grouping for chat threads — centered pill separators. */

export function dayLabelForIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function groupMessagesByDay<T>(items: T[], getIso: (item: T) => string): Array<{ label: string; items: T[] }> {
  if (!items.length) return [];
  const groups: Array<{ label: string; items: T[] }> = [];
  let currentLabel = "";
  for (const item of items) {
    const label = dayLabelForIso(getIso(item));
    if (!label) continue;
    if (label !== currentLabel) {
      groups.push({ label, items: [item] });
      currentLabel = label;
    } else {
      groups[groups.length - 1]!.items.push(item);
    }
  }
  return groups;
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full border border-black/10 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/45 dark:border-white/10">
        {label}
      </span>
    </div>
  );
}

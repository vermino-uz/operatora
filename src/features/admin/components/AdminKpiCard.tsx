export function AdminKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-divider bg-background p-4">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-foreground/50">{sub}</p> : null}
    </div>
  );
}

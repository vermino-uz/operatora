/** UZS currency formatting — ported from the old frontend's
 * `utils/currency.ts` (only the pieces `/finance` actually needs). */
export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUZSCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M UZS`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K UZS`;
  return `${amount.toLocaleString()} UZS`;
}

/** Parses a possibly-formatted UZS input string back into a plain number. */
export function parseUZS(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}

/** First day of the given month, `YYYY-MM-01` — the `payment_month`/expense
 * bucket grain the backend uses (`payments.payment_month` is a `date`). */
export function monthKey(date: Date = new Date()): string {
  return `${date.toISOString().slice(0, 7)}-01`;
}

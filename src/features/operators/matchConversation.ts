import type { OperatorConversationRow, OperatorOverviewRow } from "@/features/operators/types";

/** Display name fallback, ported verbatim from the old frontend's
 * `getDisplayName()`: prefer `full_name`; if it's identical to `email`
 * (a common seed-data artifact) or absent, derive a title-cased name
 * from the email's local part instead. */
export function operatorDisplayName(op: OperatorOverviewRow, unknownLabel = "Unknown"): string {
  if (op.full_name && op.full_name !== op.email) return op.full_name;
  if (op.email?.includes("@")) {
    const namePart = op.email.split("@")[0];
    return namePart
      .replace(/[._]/g, " ")
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  }
  return op.full_name || op.email || unknownLabel;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[._-]/g, " ").replace(/\s+/g, " ");
}

function emailPrefix(email: string | null | undefined): string {
  if (!email) return "";
  return email.includes("@") ? email.split("@")[0].toLowerCase().trim() : email.toLowerCase().trim();
}

/**
 * Fuzzy-matches a raw `conversations.operator_name` string against an
 * operator's known identity strings (display name, email, email prefix,
 * first-name) — ported verbatim from the old frontend's
 * `matchConversationToOperator`. The `conversations` table only stores a
 * free-text `operator_name` (no FK to `operators`/`profiles`), so this
 * heuristic is the real, load-bearing mechanism the old UI relies on to
 * attribute conversations to an operator card — not something this
 * rebuild invented.
 */
export function conversationMatchesOperator(
  conversation: OperatorConversationRow,
  operator: OperatorOverviewRow,
): boolean {
  const raw = conversation.operator_name?.toLowerCase().trim();
  if (!raw) return false;

  const opName = normalizeName(operatorDisplayName(operator));
  const opEmail = operator.email?.toLowerCase().trim() ?? "";
  const opEmailPrefix = emailPrefix(operator.email);
  const convOp = normalizeName(raw);

  if (opName === convOp || opEmail === raw || opEmailPrefix === raw || opEmailPrefix === convOp) return true;

  const opFirstName = opName.split(" ")[0];
  const convFirstName = convOp.split(" ")[0];
  if (opFirstName && convFirstName && opFirstName === convFirstName) return true;
  if (opEmailPrefix && (opEmailPrefix === raw || opEmailPrefix === convFirstName)) return true;
  return Boolean(opName && convOp && (opName.includes(convOp) || convOp.includes(opName)));
}

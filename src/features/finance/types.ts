/**
 * `/finance` — standalone workspace finance module (tuition/course-payment
 * tracking), DISTINCT from the `billing` *settings* section
 * (`src/features/billing/`), which is the "manage my Operatora
 * subscription" self-service view. Confirmed by reading the old frontend's
 * `pages/Finance.tsx` + `components/finance/*.tsx` directly: this page has
 * nothing to do with Operatora's own subscription/invoices — it's a
 * tuition-business back-office (courses, groups of students, per-student
 * monthly payments, expenses, audit trail) that some workspaces run their
 * own business through, gated to the `finance_manager` global role (plus
 * admin-tier roles) by the old `AuthContext.tsx#canViewPage("finance")`
 * allowlist.
 *
 * Backend trace: grepped the whole backend `src/` tree for a
 * `FinanceController`/`'finance'` `@Controller` — none exists. Every table
 * below DOES have a `db-proxy/table-registry.ts` entry (`scope:
 * 'workspace'`, `workspace_id` added later via migration
 * `0030_workspace_id_backfill_sweep.sql` — not yet reflected in the
 * `schema.prisma` snapshot `ARCHITECTURE.md` was written against), so this
 * is the sanctioned db-proxy escape hatch, same category as
 * `forms.ts`/`instructions.ts`/`cannedResponses.ts`. See
 * `services/api/finance.ts` for the exact rule per table.
 */

export interface CourseRow {
  id: string;
  name: string;
  description: string | null;
  monthly_tuition: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  course_id: string;
  monthly_due_day: number;
  current_month: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GroupMemberStatus = "active" | "left" | "paused";

export interface GroupUserRow {
  id: string;
  group_id: string;
  user_id: string | null;
  client_id: string | null;
  status: string;
  monthly_amount_override: number | null;
  left_reason: string | null;
  joined_at: string;
  left_at: string | null;
}

export interface ClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export type PaymentType = "full" | "half" | "split_first" | "split_second" | "full_course" | "half_course";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export interface PaymentRow {
  id: string;
  group_user_id: string;
  amount: number;
  payment_month: string;
  payment_date: string;
  payment_type: string;
  is_split_payment: boolean;
  split_total_amount: number | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  payment_completion_date: string | null;
  is_course_payment: boolean;
  course_payment_type: string | null;
  payment_method: string;
}

export interface ExpenseCategoryRow {
  id: string;
  name: string;
  label: string;
  color: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface FinanceAuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

/** Defensive coercion helpers — the db-proxy has no server-side response
 * shape enforcement beyond the DB's own column types, so `unknown` rows are
 * narrowed explicitly at the boundary rather than cast, matching
 * `forms/types.ts#normalizeFormRow`'s precedent. */
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function normalizeCourseRow(raw: unknown): CourseRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    name: str(r.name, "Untitled course"),
    description: strOrNull(r.description),
    monthly_tuition: num(r.monthly_tuition),
    is_active: bool(r.is_active, true),
    created_by: strOrNull(r.created_by),
    created_at: str(r.created_at, new Date(0).toISOString()),
    updated_at: str(r.updated_at, new Date(0).toISOString()),
  };
}

export function normalizeGroupRow(raw: unknown): GroupRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    name: str(r.name, "Untitled group"),
    course_id: str(r.course_id),
    monthly_due_day: num(r.monthly_due_day, 1),
    current_month: num(r.current_month, 1),
    is_active: bool(r.is_active, true),
    created_by: strOrNull(r.created_by),
    created_at: str(r.created_at, new Date(0).toISOString()),
    updated_at: str(r.updated_at, new Date(0).toISOString()),
  };
}

export function normalizeGroupUserRow(raw: unknown): GroupUserRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    group_id: str(r.group_id),
    user_id: strOrNull(r.user_id),
    client_id: strOrNull(r.client_id),
    status: str(r.status, "active"),
    monthly_amount_override: numOrNull(r.monthly_amount_override),
    left_reason: strOrNull(r.left_reason),
    joined_at: str(r.joined_at, new Date(0).toISOString()),
    left_at: strOrNull(r.left_at),
  };
}

export function normalizeClientRow(raw: unknown): ClientRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    full_name: str(r.full_name, "Unnamed client"),
    phone: strOrNull(r.phone),
    email: strOrNull(r.email),
    notes: strOrNull(r.notes),
    created_at: str(r.created_at, new Date(0).toISOString()),
  };
}

export function normalizePaymentRow(raw: unknown): PaymentRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    group_user_id: str(r.group_user_id),
    amount: num(r.amount),
    payment_month: str(r.payment_month),
    payment_date: str(r.payment_date, new Date(0).toISOString()),
    payment_type: str(r.payment_type, "full"),
    is_split_payment: bool(r.is_split_payment),
    split_total_amount: numOrNull(r.split_total_amount),
    notes: strOrNull(r.notes),
    recorded_by: strOrNull(r.recorded_by),
    created_at: str(r.created_at, new Date(0).toISOString()),
    payment_completion_date: strOrNull(r.payment_completion_date),
    is_course_payment: bool(r.is_course_payment),
    course_payment_type: strOrNull(r.course_payment_type),
    payment_method: str(r.payment_method, "cash"),
  };
}

export function normalizeExpenseCategoryRow(raw: unknown): ExpenseCategoryRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    name: str(r.name),
    label: str(r.label, str(r.name)),
    color: strOrNull(r.color),
    is_active: bool(r.is_active, true),
    display_order: num(r.display_order),
    created_by: strOrNull(r.created_by),
    created_at: str(r.created_at, new Date(0).toISOString()),
  };
}

export function normalizeExpenseRow(raw: unknown): ExpenseRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    amount: num(r.amount),
    description: str(r.description),
    category: str(r.category, "general"),
    expense_date: str(r.expense_date, new Date(0).toISOString().slice(0, 10)),
    recorded_by: strOrNull(r.recorded_by),
    notes: strOrNull(r.notes),
    created_at: str(r.created_at, new Date(0).toISOString()),
  };
}

export function normalizeFinanceAuditLogRow(raw: unknown): FinanceAuditLogRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id),
    action: str(r.action),
    entity_type: str(r.entity_type),
    entity_id: strOrNull(r.entity_id),
    old_values: (r.old_values ?? null) as Record<string, unknown> | null,
    new_values: (r.new_values ?? null) as Record<string, unknown> | null,
    user_id: strOrNull(r.user_id),
    created_at: str(r.created_at, new Date(0).toISOString()),
  };
}

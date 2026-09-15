import { dbProxyQuery } from "@/services/api/db-proxy";
import {
  normalizeClientRow,
  normalizeCourseRow,
  normalizeExpenseCategoryRow,
  normalizeExpenseRow,
  normalizeFinanceAuditLogRow,
  normalizeGroupRow,
  normalizeGroupUserRow,
  normalizePaymentRow,
  type ClientRow,
  type CourseRow,
  type ExpenseCategoryRow,
  type ExpenseRow,
  type FinanceAuditLogRow,
  type GroupRow,
  type GroupUserRow,
  type PaymentRow,
} from "@/features/finance/types";

/**
 * `/finance` CRUD — see `features/finance/types.ts` for the full backend
 * trace. None of `courses`/`groups`/`group_users`/`clients`/`payments`/
 * `expenses`/`expense_categories`/`finance_audit_logs` has a dedicated REST
 * controller; all go through the db-proxy escape hatch, same category as
 * `forms.ts`. `workspace_id` scoping and per-table `writeRoles` are
 * enforced server-side from the JWT — never passed explicitly here.
 */

const COURSES_TABLE = "courses";
const GROUPS_TABLE = "groups";
const GROUP_USERS_TABLE = "group_users";
const CLIENTS_TABLE = "clients";
const PAYMENTS_TABLE = "payments";
const EXPENSES_TABLE = "expenses";
const EXPENSE_CATEGORIES_TABLE = "expense_categories";
const AUDIT_LOGS_TABLE = "finance_audit_logs";

export const coursesApi = {
  async list(): Promise<CourseRow[]> {
    const rows = await dbProxyQuery<unknown[]>(COURSES_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return (rows ?? []).map(normalizeCourseRow);
  },
  async create(input: { name: string; description: string | null; monthly_tuition: number; is_active: boolean; created_by: string | null }): Promise<CourseRow> {
    const rows = await dbProxyQuery<unknown[]>(COURSES_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeCourseRow(row);
  },
  async update(id: string, input: { name: string; description: string | null; monthly_tuition: number; is_active: boolean }): Promise<CourseRow> {
    const rows = await dbProxyQuery<unknown[]>(COURSES_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { ...input, updated_at: new Date().toISOString() },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return normalizeCourseRow(row);
  },
  async remove(id: string): Promise<void> {
    await dbProxyQuery<unknown[]>(COURSES_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },
};

export const groupsApi = {
  async list(): Promise<GroupRow[]> {
    const rows = await dbProxyQuery<unknown[]>(GROUPS_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return (rows ?? []).map(normalizeGroupRow);
  },
  async create(input: { name: string; course_id: string; monthly_due_day: number; current_month: number; is_active: boolean; created_by: string | null }): Promise<GroupRow> {
    const rows = await dbProxyQuery<unknown[]>(GROUPS_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeGroupRow(row);
  },
  async update(id: string, input: { name: string; course_id: string; monthly_due_day: number; current_month: number; is_active: boolean }): Promise<GroupRow> {
    const rows = await dbProxyQuery<unknown[]>(GROUPS_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { ...input, updated_at: new Date().toISOString() },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return normalizeGroupRow(row);
  },
  async remove(id: string): Promise<void> {
    await dbProxyQuery<unknown[]>(GROUPS_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },
};

export const groupUsersApi = {
  async listForGroups(groupIds: string[]): Promise<GroupUserRow[]> {
    if (groupIds.length === 0) return [];
    const rows = await dbProxyQuery<unknown[]>(GROUP_USERS_TABLE, {
      method: "select",
      select: "*",
      filters: [{ column: "group_id", op: "in", value: groupIds }],
      order: [{ column: "joined_at", ascending: false }],
    });
    return (rows ?? []).map(normalizeGroupUserRow);
  },
  async add(input: { group_id: string; client_id: string; status: string; monthly_amount_override: number | null }): Promise<GroupUserRow> {
    // `user_id` is NOT NULL on this table in the old system's usage (operator/profile
    // membership), but the finance domain's actual members are `clients` (external
    // students), so `user_id` mirrors `client_id` here — same dual-id pattern the old
    // `GroupsTab.tsx` used (`groupUser.user_id || groupUser.client_id`).
    const rows = await dbProxyQuery<unknown[]>(GROUP_USERS_TABLE, {
      method: "insert",
      values: [{ ...input, user_id: input.client_id }],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeGroupUserRow(row);
  },
  async updateStatus(id: string, input: { status: string; left_reason: string | null; left_at: string | null }): Promise<GroupUserRow> {
    const rows = await dbProxyQuery<unknown[]>(GROUP_USERS_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: input,
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return normalizeGroupUserRow(row);
  },
  async remove(id: string): Promise<void> {
    await dbProxyQuery<unknown[]>(GROUP_USERS_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },
};

export const clientsApi = {
  async list(): Promise<ClientRow[]> {
    const rows = await dbProxyQuery<unknown[]>(CLIENTS_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "full_name", ascending: true }],
    });
    return (rows ?? []).map(normalizeClientRow);
  },
  async create(input: { full_name: string; phone: string | null; email: string | null; notes: string | null; created_by: string | null }): Promise<ClientRow> {
    const rows = await dbProxyQuery<unknown[]>(CLIENTS_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeClientRow(row);
  },
};

export const paymentsApi = {
  async listForGroupUsers(groupUserIds: string[]): Promise<PaymentRow[]> {
    if (groupUserIds.length === 0) return [];
    const rows = await dbProxyQuery<unknown[]>(PAYMENTS_TABLE, {
      method: "select",
      select: "*",
      filters: [{ column: "group_user_id", op: "in", value: groupUserIds }],
      order: [{ column: "payment_date", ascending: false }],
      limit: 500,
    });
    return (rows ?? []).map(normalizePaymentRow);
  },
  async record(input: {
    group_user_id: string;
    amount: number;
    payment_month: string;
    payment_type: string;
    is_split_payment: boolean;
    split_total_amount: number | null;
    notes: string | null;
    recorded_by: string | null;
    is_course_payment: boolean;
    payment_method: string;
  }): Promise<PaymentRow> {
    const rows = await dbProxyQuery<unknown[]>(PAYMENTS_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizePaymentRow(row);
  },
  async remove(id: string): Promise<void> {
    await dbProxyQuery<unknown[]>(PAYMENTS_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },

  /** All payments for a given `payment_month` bucket (`YYYY-MM-01`) — used
   * by the Analytics tab's expected/collected-revenue computation, mirroring
   * the old `FinanceAnalytics.tsx`'s `.eq('payment_month', currentMonth)`
   * query (client-side aggregation, same "no rel join" constraint as
   * `formsApi.submissionCounts`). */
  async listByMonth(paymentMonth: string): Promise<PaymentRow[]> {
    const rows = await dbProxyQuery<unknown[]>(PAYMENTS_TABLE, {
      method: "select",
      select: "*",
      filters: [{ column: "payment_month", op: "eq", value: paymentMonth }],
    });
    return (rows ?? []).map(normalizePaymentRow);
  },
};

export const expenseCategoriesApi = {
  async list(): Promise<ExpenseCategoryRow[]> {
    const rows = await dbProxyQuery<unknown[]>(EXPENSE_CATEGORIES_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "display_order", ascending: true }],
    });
    return (rows ?? []).map(normalizeExpenseCategoryRow);
  },
  async create(input: { name: string; label: string; color: string | null; created_by: string | null }): Promise<ExpenseCategoryRow> {
    const rows = await dbProxyQuery<unknown[]>(EXPENSE_CATEGORIES_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeExpenseCategoryRow(row);
  },
  async setActive(id: string, is_active: boolean): Promise<void> {
    await dbProxyQuery<unknown[]>(EXPENSE_CATEGORIES_TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { is_active, updated_at: new Date().toISOString() },
    });
  },
};

export const expensesApi = {
  async list(): Promise<ExpenseRow[]> {
    const rows = await dbProxyQuery<unknown[]>(EXPENSES_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "expense_date", ascending: false }],
      limit: 500,
    });
    return (rows ?? []).map(normalizeExpenseRow);
  },
  async create(input: { amount: number; description: string; category: string; expense_date: string; notes: string | null; recorded_by: string | null }): Promise<ExpenseRow> {
    const rows = await dbProxyQuery<unknown[]>(EXPENSES_TABLE, { method: "insert", values: [input], returning: "representation" });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return normalizeExpenseRow(row);
  },
  async remove(id: string): Promise<void> {
    await dbProxyQuery<unknown[]>(EXPENSES_TABLE, { method: "delete", filters: [{ column: "id", op: "eq", value: id }] });
  },

  /** Expenses within `[startDateIso, endDateIso)` — used by the Analytics
   * tab for the "this month's expenses" metric. */
  async listByDateRange(startDateIso: string, endDateIsoExclusive: string): Promise<ExpenseRow[]> {
    const rows = await dbProxyQuery<unknown[]>(EXPENSES_TABLE, {
      method: "select",
      select: "amount,expense_date",
      filters: [
        { column: "expense_date", op: "gte", value: startDateIso },
        { column: "expense_date", op: "lt", value: endDateIsoExclusive },
      ],
    });
    return (rows ?? []).map(normalizeExpenseRow);
  },
};

export const financeAuditLogsApi = {
  /** Read-only from the frontend's perspective — the old page never wrote
   * to this table client-side either (the name implies a DB trigger/backend
   * writer, though none was confirmed; kept read-only here regardless since
   * the old UI never exposed a write path). */
  async list(): Promise<FinanceAuditLogRow[]> {
    const rows = await dbProxyQuery<unknown[]>(AUDIT_LOGS_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
      limit: 100,
    });
    return (rows ?? []).map(normalizeFinanceAuditLogRow);
  },
};
